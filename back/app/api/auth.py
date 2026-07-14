from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import DbSession
from app.core.errors import ApiError
from app.core.security import decode_token, hash_password, issue_tokens, verify_password
from app.models import Profile, User
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest, db: DbSession) -> AuthResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise ApiError(409, "EMAIL_TAKEN", "이미 가입된 이메일이에요.")

    user = User(
        email=payload.email,
        name=payload.name or payload.email.split("@")[0],
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()

    tokens = issue_tokens(user.id)
    return AuthResponse(**tokens, is_new_user=True)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise ApiError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않아요.")

    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    is_new_user = profile is None or not profile.onboarding_completed

    tokens = issue_tokens(user.id)
    return AuthResponse(**tokens, is_new_user=is_new_user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: DbSession) -> TokenResponse:
    user_id = decode_token(payload.refresh_token, "refresh")
    if db.get(User, user_id) is None:
        raise ApiError(401, "INVALID_TOKEN", "인증 정보가 올바르지 않아요.")
    return TokenResponse(**issue_tokens(user_id))
