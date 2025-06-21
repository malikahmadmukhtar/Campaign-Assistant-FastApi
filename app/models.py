from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    access_token: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatMessageCreate(BaseModel):
    content: str
    session_id: Optional[int] = None

class ChatSessionCreate(BaseModel):
    title: str