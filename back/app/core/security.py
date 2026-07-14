from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt

from app.core.config import settings
from app.core.errors import ApiError

ALGORITHM = "HS256"
TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: str, token_type: TokenType) -> str:
    ttl = (
        timedelta(minutes=settings.access_token_ttl_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_ttl_days)
    )
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "type": token_type, "iat": now, "exp": now + ttl}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: TokenType) -> str:
    """토큰을 검증하고 user_id를 반환한다. 실패하면 401."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ApiError(401, "TOKEN_EXPIRED", "로그인이 만료되었어요. 다시 로그인해 주세요.") from None
    except jwt.PyJWTError:
        raise ApiError(401, "INVALID_TOKEN", "인증 정보가 올바르지 않아요.") from None

    if payload.get("type") != expected_type:
        raise ApiError(401, "INVALID_TOKEN", "인증 정보가 올바르지 않아요.")

    user_id = payload.get("sub")
    if not user_id:
        raise ApiError(401, "INVALID_TOKEN", "인증 정보가 올바르지 않아요.")
    return str(user_id)


def issue_tokens(user_id: str) -> dict[str, str]:
    return {
        "accessToken": create_token(user_id, "access"),
        "refreshToken": create_token(user_id, "refresh"),
    }
