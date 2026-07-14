from datetime import datetime

from sqlalchemy import JSON, DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.user import new_id, utcnow


class ScoreCache(Base):
    """에이전트가 계산한 추천 점수·이유를 재사용하기 위한 캐시.

    한 행이 배치 하나에 대응한다(예: 어떤 사용자에게 보여줄 추천 방 묶음 전체).

    - `scope`   무엇에 대한 배치인가. 대상 id 집합에서 파생되므로, 목록 화면과 상세 화면이
                서로의 캐시를 덮어쓰지 않는다.
    - `fingerprint`  입력(프로필 + 대상들의 내용 + 모델)의 해시. 이 값이 달라지면 다시 계산한다.
                     TTL을 두지 않는 이유는, 입력이 그대로면 결과도 그대로이기 때문이다.
    """

    __tablename__ = "score_cache"
    __table_args__ = (UniqueConstraint("viewer_id", "kind", "scope", name="uq_score_cache"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("cache"))
    viewer_id: Mapped[str] = mapped_column(String, index=True)
    kind: Mapped[str] = mapped_column(String)  # room | candidate | person
    scope: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)

    # { target_id: { "score": int, "reason": str } }
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
