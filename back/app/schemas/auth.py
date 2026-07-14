from pydantic import EmailStr, Field

from app.schemas.base import CamelModel


class SignupRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8)
    # 프론트 회원가입 폼은 이름을 받지만 아직 전송하지 않는다. 선택 필드로 두고 이메일 앞부분을 기본값으로 쓴다.
    name: str | None = None


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class RefreshRequest(CamelModel):
    refresh_token: str


class TokenResponse(CamelModel):
    access_token: str
    refresh_token: str


class AuthResponse(TokenResponse):
    is_new_user: bool
