"""인연 방 이전의 1:1 매칭 계열 모델.

추천(Recommendation) 자체는 저장하지 않는다. 사용자 프로필과 다른 사용자들을 바탕으로
요청 시점에 계산하고, 그 id는 `rec-{상대 user_id}`로 결정된다. 저장하는 것은
'사용자가 무엇을 했는가'(수락/거절), 그 결과로 맺어진 매칭, 그리고 피드백뿐이다.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User, new_id, utcnow


class RecommendationAction(Base):
    """추천에 대한 수락/거절. 같은 상대를 두 번 처리하지 못하게 막는 근거이기도 하다."""

    __tablename__ = "recommendation_actions"
    __table_args__ = (UniqueConstraint("user_id", "candidate_id", name="uq_recommendation_action"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("recact"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    candidate_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String)  # accept | reject
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("match"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    counterpart_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="active")  # active | ended
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    counterpart: Mapped[User] = relationship(foreign_keys=[counterpart_id])


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("feedback"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.id"), index=True)
    satisfaction_score: Mapped[int] = mapped_column(Integer)  # 1~5
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
