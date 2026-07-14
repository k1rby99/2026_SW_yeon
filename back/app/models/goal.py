from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User, new_id, utcnow


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("goal"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="processing")  # processing | completed | failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship()


class GoalAnalysis(Base):
    """분석 결과 저장소. 지금은 목업 엔진이 채우고, 추후 분석 에이전트가 같은 표를 채운다."""

    __tablename__ = "goal_analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("analysis"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    goal_id: Mapped[str | None] = mapped_column(ForeignKey("goals.id"), nullable=True)

    source_text: Mapped[str] = mapped_column(Text, default="")
    normalized_goal: Mapped[str] = mapped_column(Text, default="")
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    suggested_room_type: Mapped[str] = mapped_column(String, default="project")
    suggested_roles: Mapped[list] = mapped_column(JSON, default=list)
    recommended_room_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
