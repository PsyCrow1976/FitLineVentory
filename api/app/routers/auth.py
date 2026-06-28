from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, require_admin, verify_password
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, Token, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> Token:
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(user.id, user.username)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserRead:
    is_admin = user.username == settings.admin_username
    return UserRead(id=user.id, username=user.username, is_admin=is_admin)