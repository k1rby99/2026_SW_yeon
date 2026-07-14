from sqlalchemy import JSON, Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.user import new_id


class Opportunity(Base):
    """공모전·모집 공고 카탈로그. 사용자가 만드는 것이 아니라 운영자가 채우는 자료다."""

    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("op"))
    type: Mapped[str] = mapped_column(String)  # contest | announcement
    status: Mapped[str] = mapped_column(String, default="open")  # open | upcoming | closed
    category: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String)
    organizer: Mapped[str] = mapped_column(String, default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String, default="")
    deadline: Mapped[str] = mapped_column(String, default="")  # YYYY-MM-DD
    period: Mapped[str] = mapped_column(String, default="")
    eligibility: Mapped[str] = mapped_column(Text, default="")
    official_url: Mapped[str] = mapped_column(String, default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)

    tags: Mapped[list] = mapped_column(JSON, default=list)
    benefits: Mapped[list] = mapped_column(JSON, default=list)
