from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12]}"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("user"))
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    profile: Mapped["Profile | None"] = relationship(back_populates="user", uselist=False)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("profile"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)

    role: Mapped[str] = mapped_column(String, default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    collab_style: Mapped[str] = mapped_column(Text, default="")
    visibility_scope: Mapped[str] = mapped_column(String, default="public")  # public | limited | private
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    interests: Mapped[list] = mapped_column(JSON, default=list)
    skill_tags: Mapped[list] = mapped_column(JSON, default=list)
    project_history: Mapped[list] = mapped_column(JSON, default=list)
    # 계약서 §6 권장 필드: [{ key, label, level: 1|2|3 }]
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    social_links: Mapped[dict] = mapped_column(JSON, default=dict)

    # 프로필 분석 에이전트의 산출물. { summary, collaborationStyle, derivedTags, strengths }
    insight: Mapped[dict] = mapped_column(JSON, default=dict)

    user: Mapped[User] = relationship(back_populates="profile")
