from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel, IsoDatetime
from app.schemas.profile import SocialLinks

RoomType = Literal["competition", "hackathon", "study", "project", "coffee_chat", "networking"]
RoomStatus = Literal["recruiting", "active", "ended"]
MembershipRole = Literal["owner", "member"] | None
ApplicationStatus = Literal["none", "pending", "approved", "rejected"]
InvitationStatus = Literal["none", "pending", "accepted", "declined"]
Visibility = Literal["public", "private"]
ApplicationMode = Literal["approval", "instant"]
MeetingStyle = Literal["online", "offline", "hybrid"]


class UserRef(CamelModel):
    id: str
    name: str


class RoomResponse(CamelModel):
    id: str
    title: str
    type: RoomType
    summary: str
    image_url: str | None = None
    tags: list[str]
    required_roles: list[str]
    status: RoomStatus
    member_count: int
    capacity: int
    match_score: int | None = None
    deadline: str | None = None
    owner: UserRef
    # 요청한 사용자 기준으로 계산되는 값 (방 자체의 속성이 아니다)
    membership_role: MembershipRole = None
    application_status: ApplicationStatus = "none"
    visibility: Visibility | None = None
    application_mode: ApplicationMode | None = None
    meeting_style: MeetingStyle | None = None
    location: str | None = None
    notice: str | None = None
    created_at: IsoDatetime


class RoomCreateRequest(CamelModel):
    title: str = Field(min_length=1)
    type: RoomType
    summary: str = ""
    tags: list[str] = Field(default_factory=list)
    required_roles: list[str] = Field(default_factory=list)
    capacity: int = Field(default=4, ge=1, le=50)
    deadline: str | None = None
    visibility: Visibility = "public"
    application_mode: ApplicationMode = "approval"
    meeting_style: MeetingStyle = "online"
    location: str | None = None
    notice: str | None = None


class RoomUpdateRequest(CamelModel):
    title: str | None = None
    type: RoomType | None = None
    summary: str | None = None
    tags: list[str] | None = None
    required_roles: list[str] | None = None
    capacity: int | None = Field(default=None, ge=1, le=50)
    deadline: str | None = None
    visibility: Visibility | None = None
    application_mode: ApplicationMode | None = None
    meeting_style: MeetingStyle | None = None
    location: str | None = None
    notice: str | None = None
    status: RoomStatus | None = None


class RoomCandidateResponse(CamelModel):
    id: str
    name: str
    role: str
    bio: str
    skill_tags: list[str]
    interests: list[str]
    match_score: int
    reason: str
    invitation_status: InvitationStatus


class ApplicationResponse(CamelModel):
    id: str
    applicant: RoomCandidateResponse
    message: str
    status: Literal["pending", "approved", "rejected"]
    created_at: IsoDatetime


class ApplicationCreateRequest(CamelModel):
    message: str = ""


class ApplicationDecisionRequest(CamelModel):
    action: Literal["approve", "reject"]


class InvitationCreateRequest(CamelModel):
    user_id: str
    message: str = ""


class InvitationResponse(CamelModel):
    id: str
    status: InvitationStatus
    created_at: IsoDatetime


class ReceivedInvitationResponse(CamelModel):
    """내가 받은 초대. 어떤 방에 누가 불렀는지가 함께 있어야 수락 여부를 판단할 수 있다."""

    id: str
    status: InvitationStatus
    message: str
    created_at: IsoDatetime
    room: RoomResponse
    inviter: UserRef


class InvitationDecisionRequest(CamelModel):
    action: Literal["accept", "decline"]


class MessageResponse(CamelModel):
    id: str
    sender: UserRef
    content: str
    created_at: IsoDatetime


class MessageCreateRequest(CamelModel):
    content: str = Field(min_length=1)


class MemberSummaryResponse(CamelModel):
    id: str
    name: str
    role: str
    bio: str
    skill_tags: list[str]
    is_owner: bool
    joined_at: IsoDatetime


class MemberProfileResponse(MemberSummaryResponse):
    interests: list[str]
    collab_style: str
    project_history: list[str]
    social_links: SocialLinks | None = None


class CursorPage[T](CamelModel):
    items: list[T]
    next_cursor: str | None = None
