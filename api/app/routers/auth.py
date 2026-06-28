from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, verify_password
from app.config import settings
from app.database import get_db
from app.models import ProductSource, User
from app.schemas import LoginRequest, ProfileUpdate, Token, UserRead
from app.services.country import SUPPORTED_COUNTRY_CODES

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_read(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        username=user.username,
        is_admin=user.username == settings.admin_username,
        default_country_code=user.default_country_code or "DK",
    )


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> Token:
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(user.id, user.username)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserRead:
    return _user_read(user)


@router.patch("/profile", response_model=UserRead)
def update_profile(
    payload: ProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    country_code = payload.default_country_code.upper()
    if country_code not in SUPPORTED_COUNTRY_CODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported country code: {country_code}",
        )

    source = db.scalar(select(ProductSource).where(ProductSource.country_code == country_code))
    if not source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No product source configured for country {country_code}",
        )

    user.default_country_code = country_code
    db.commit()
    db.refresh(user)
    return _user_read(user)