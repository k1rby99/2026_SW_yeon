from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User, new_id, utcnow


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("room"))
    title: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)  # competition | hackathon | study | project | coffee_chat | networking
    summary: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="recruiting")  # recruiting | active | ended
    capacity: Mapped[int] = mapped_column(Integer, default=4)
    deadline: Mapped[str | None] = mapped_column(String, nullable=True)  # YYYY-MM-DD

    tags: Mapped[list] = mapped_column(JSON, default=list)
    required_roles: Mapped[list] = mapped_column(JSON, default=list)

    visibility: Mapped[str] = mapped_column(String, default="public")  # public | private
    application_mode: Mapped[str] = mapped_column(String, default="approval")  # approval | instant
    meeting_style: Mapped[str] = mapped_column(String, default="online")  # online | offline | hybrid
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    notice: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped[User] = relationship()
    members: Mapped[list["RoomMember"]] = relationship(back_populates="room", cascade="all, delete-orphan")

    @property
    def member_count(self) -> int:
        return len(self.members)

    @property
    def is_full(self) -> bool:
        return self.member_count >= self.capacity


class RoomMember(Base):
    __tablename__ = "room_members"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_member"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("member"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    room: Mapped[Room] = relationship(back_populates="members")
    user: Mapped[User] = relationship()


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("application"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), index=True)
    applicant_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | approved | rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    room: Mapped[Room] = relationship()
    applicant: Mapped[User] = relationship()


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("invitation"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | accepted | declined
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    room: Mapped[Room] = relationship()
    user: Mapped[User] = relationship()


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("message"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    room: Mapped[Room] = relationship()
    sender: Mapped[User] = relationship()
