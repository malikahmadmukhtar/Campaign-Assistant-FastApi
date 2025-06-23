from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.database import ChatSession, ChatMessage


def get_user_chat_sessions(db: Session, user_id: int):
    return db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()).all()


def get_chat_messages(db: Session, session_id: int):
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(
        ChatMessage.created_at.asc()).all()


def create_chat_session(db: Session, user_id: int, title: str):
    db_session = ChatSession(user_id=user_id, title=title)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def add_chat_message(db: Session, session_id: int, sender: str, content: str):
    db_message = ChatMessage(session_id=session_id, sender=sender, content=content)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def delete_chat_session(db: Session, session_id: int, user_id: int):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted successfully"}

def get_last_n_chat_messages(db: Session, session_id: int, n: int = 20):
    messages = db.query(ChatMessage)\
        .filter(ChatMessage.session_id == session_id)\
        .order_by(ChatMessage.created_at.desc())\
        .limit(n)\
        .all()
    return list(reversed(messages))  # To maintain ascending order

def format_messages_for_context(messages: list[ChatMessage]) -> str:
    return "\n".join([f"{msg.sender}: {msg.content}" for msg in messages])
