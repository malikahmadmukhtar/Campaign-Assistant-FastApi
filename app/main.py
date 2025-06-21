from typing import Annotated

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi import File, UploadFile, status, HTTPException

from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi import status, Form

from app.config.settings import ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db, User, ChatSession, init_db
from app.auth import (
    create_access_token,
    get_current_user,
    authenticate_user,
    get_password_hash
)
from app.models import UserCreate, Token, ChatMessageCreate, ChatSessionCreate
from app.tools.facebook.ad_creatives import upload_image_to_facebook
from app.utils.agent import initialize_gemini_agent
from app.utils.chat import (
    get_user_chat_sessions,
    get_chat_messages,
    create_chat_session,
    add_chat_message,
    delete_chat_session, get_last_n_chat_messages, format_messages_for_context
)
from datetime import timedelta
import re
from dotenv import load_dotenv

from app.utils.uploader import upload_file_to_cloudinary

load_dotenv()

app = FastAPI()

# Initialize database
init_db()

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Templates
templates = Jinja2Templates(directory="app/templates")

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


# API Routes
@app.post("/token", response_model=Token)
async def login_for_access_token(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}



@app.post("/register")
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    if len(user.name) < 4:
        raise HTTPException(status_code=400, detail="Name must be at least 4 characters long")

    if len(user.password) < 5:
        raise HTTPException(status_code=400, detail="Password must be at least 5 characters long")
    if user.password != user.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if not EMAIL_REGEX.match(user.email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    if user.access_token:
        if len(user.access_token) < 150:
            raise HTTPException(status_code=400, detail="Access token must be at least 150 characters long")

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        access_token=user.access_token
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User registered successfully"}
    # return {"message": "User registered successfully", "user_id": db_user.id}


@app.get("/chat/sessions", response_model=list[dict])
async def get_sessions(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    sessions = get_user_chat_sessions(db, current_user.id)
    return [{"id": s.id, "title": s.title, "created_at": s.created_at} for s in sessions]


@app.post("/chat/sessions", response_model=dict)
async def create_session(
        session_data: ChatSessionCreate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    session = create_chat_session(db, current_user.id, session_data.title)
    return {"id": session.id, "title": session.title}


@app.delete("/chat/sessions/{session_id}")
async def delete_session(
        session_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    return delete_chat_session(db, session_id, current_user.id)


@app.get("/chat/messages/{session_id}", response_model=list[dict])
async def get_messages(
        session_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Verify the session belongs to the user
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = get_chat_messages(db, session_id)
    return [{"sender": m.sender, "content": m.content, "created_at": m.created_at} for m in messages]


# Update the create_message endpoint


@app.post("/chat/messages/{session_id}", response_model=dict)
async def create_message(
    session_id: int,
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 1. Validate chat session
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")

        # 2. Save user message
        add_chat_message(db, session_id, "user", message.content)

        # 3. Update title if this is the first message
        if not session.title or session.title == "New Chat":
            new_title = message.content[:20] + ("..." if len(message.content) > 20 else "")
            session.title = new_title
            db.commit()
            db.refresh(session)

        # 4. Fetch context from last 20 messages
        past_messages = get_last_n_chat_messages(db, session_id, 20)
        context = format_messages_for_context(past_messages)
        print(context)
        context += f"\nuser: {message.content}"  # Include current message
        # 5. Invoke the agent
        try:
            agent = initialize_gemini_agent()
            result = agent.invoke({"input": context})
            final_response = result.get("output", "Sorry, I didn’t understand that.")
        except Exception as e:
            print(f"Agent error: {str(e)}")
            final_response = "I encountered an error processing your request. Please try again."

        # 6. Save agent message
        add_chat_message(db, session_id, "agent", final_response)

        return {"sender": "agent", "content": final_response}

    except Exception as e:
        print(f"Error in create_message: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing message")


# Add this new endpoint for loading chat sessions
@app.get("/chat/sessions/{session_id}", response_model=list[dict])
async def get_session_messages(
        session_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Verify the session belongs to the user
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = get_chat_messages(db, session_id)
    return [{"sender": m.sender, "content": m.content, "created_at": m.created_at} for m in messages]


# Frontend Routes
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
async def read_register(request: Request):
    return templates.TemplateResponse("auth/register.html", {"request": request})


@app.get("/chat", response_class=HTMLResponse)
async def read_chat(request: Request):
    return templates.TemplateResponse("chat/index.html", {"request": request})

# NEW: Endpoint to get the current logged-in user's details
@app.get("/user/me", response_model=dict)
async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """
    Retrieves the details of the currently authenticated user.
    """
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }


@app.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_form(request: Request):
    return templates.TemplateResponse("auth/forgot_password.html", {"request": request})


@app.post("/forgot-password")
async def reset_password_direct(
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    db: Session = Depends(get_db)
):
    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_password = get_password_hash(password)
    user.hashed_password = hashed_password
    db.commit()
    return {"message": "Password updated successfully"}



@app.post("/upload-product-image", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: Annotated[UploadFile, File()],
    current_user: User = Depends(get_current_user) # Keep authentication
):
    """
    Handles image file upload requests, validates the file, and then
    uploads it to Cloudinary using the helper function.
    """
    # 1. Validate file type
    allowed_mime_types = ["image/jpeg", "image/png", "image/gif"]
    if file.content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and GIF images are allowed."
        )

    # 2. Validate file size (e.g., limit to 5MB)
    max_file_size_mb = 5
    max_file_size_bytes = max_file_size_mb * 1024 * 1024
    file_content = await file.read() # Read file content asynchronously
    if len(file_content) > max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the limit of {max_file_size_mb}MB."
        )

    try:
        # 3. Call the separated helper function to perform the actual upload
        image_url = upload_file_to_cloudinary(file_content, resource_type="image", folder="chat_uploads")

    except Exception as e:
        # Catch any exceptions from the helper function
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during image upload process: {e}"
        )

    return {"message": "Image uploaded successfully", "image_url": image_url}



@app.post("/upload-creative-image", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: Annotated[UploadFile, File()],
    current_user: User = Depends(get_current_user) # Keep authentication
):
    """
    Handles image file upload requests, validates the file, and then
    uploads it to Cloudinary using the helper function.
    """
    # 1. Validate file type
    allowed_mime_types = ["image/jpeg", "image/png"]
    if file.content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG images are allowed."
        )

    # 2. Validate file size (e.g., limit to 5MB)
    max_file_size_mb = 5
    max_file_size_bytes = max_file_size_mb * 1024 * 1024
    file_content = await file.read() # Read file content asynchronously
    if len(file_content) > max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the limit of {max_file_size_mb}MB."
        )

    try:
        # 3. Call the separated helper function to perform the actual upload
        image_hash = upload_image_to_facebook(file_content)

    except Exception as e:
        # Catch any exceptions from the helper function
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during image upload process: {e}"
        )

    return {"message": "Image uploaded successfully", "image_hash": image_hash}
