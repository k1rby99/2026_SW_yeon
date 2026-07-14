from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import decode_token
from app.models import User

# auto_error=False로 두고 직접 401을 던져야 `{code, message}` 형태를 유지할 수 있다.
bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise ApiError(401, "UNAUTHORIZED", "로그인이 필요해요.")

    user_id = decode_token(credentials.credentials, "access")
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(401, "UNAUTHORIZED", "로그인이 필요해요.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
