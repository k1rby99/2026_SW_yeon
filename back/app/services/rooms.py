"""방 응답 조립. membershipRole/applicationStatus/matchScore는 방의 속성이 아니라
'요청한 사용자 기준'으로 계산되는 값이라 여기서 붙인다."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import Application, Invitation, Profile, Room, RoomMember, User
from app.schemas.room import (
    ApplicationResponse,
    MemberProfileResponse,
    MemberSummaryResponse,
    MessageResponse,
    RoomCandidateResponse,
    RoomResponse,
    UserRef,
)
from app.services.analysis import AnalysisAgent, PersonView, person_view


def get_profile(db: Session, user_id: str) -> Profile | None:
    return db.scalar(select(Profile).where(Profile.user_id == user_id))


def view_of(db: Session, user: User) -> PersonView:
    """분석 계층에 넘길 사람 요약. ORM이 에이전트 안으로 새어 들어가지 않게 한다."""
    return person_view(user, get_profile(db, user.id))


def get_room_or_404(db: Session, room_id: str) -> Room:
    room = db.get(Room, room_id)
    if room is None:
        raise ApiError(404, "ROOM_NOT_FOUND", "인연을 찾을 수 없어요.")
    return room


def membership_of(db: Session, room: Room, user_id: str) -> RoomMember | None:
    return db.scalar(
        select(RoomMember).where(RoomMember.room_id == room.id, RoomMember.user_id == user_id)
    )


def require_owner(db: Session, room: Room, user: User) -> None:
    if room.owner_id != user.id:
        raise ApiError(403, "FORBIDDEN", "방장만 할 수 있는 작업이에요.")


def require_member(db: Session, room: Room, user: User) -> RoomMember:
    membership = membership_of(db, room, user.id)
    if membership is None:
        raise ApiError(403, "FORBIDDEN", "참여자만 볼 수 있어요.")
    return membership


def _application_status(db: Session, room: Room, user_id: str) -> str:
    if membership_of(db, room, user_id) is not None:
        return "approved"
    application = db.scalar(
        select(Application)
        .where(Application.room_id == room.id, Application.applicant_id == user_id)
        .order_by(Application.created_at.desc())
    )
    return application.status if application else "none"


def serialize_room(db: Session, room: Room, viewer: User, agent: AnalysisAgent) -> RoomResponse:
    membership = membership_of(db, room, viewer.id)
    if membership is None:
        membership_role = None
    else:
        membership_role = "owner" if membership.is_owner else "member"

    return RoomResponse(
        id=room.id,
        title=room.title,
        type=room.type,
        summary=room.summary,
        image_url=room.image_url,
        tags=room.tags,
        required_roles=room.required_roles,
        status=room.status,
        member_count=room.member_count,
        capacity=room.capacity,
        match_score=agent.score_room(view_of(db, viewer), room),
        deadline=room.deadline,
        owner=UserRef(id=room.owner.id, name=room.owner.name),
        membership_role=membership_role,
        application_status=_application_status(db, room, viewer.id),
        visibility=room.visibility,
        application_mode=room.application_mode,
        meeting_style=room.meeting_style,
        location=room.location,
        notice=room.notice,
        created_at=room.created_at,
    )


def serialize_candidate(
    db: Session, room: Room, user: User, agent: AnalysisAgent
) -> RoomCandidateResponse:
    person = view_of(db, user)
    scored = agent.score_candidate(room, person)

    invitation = db.scalar(
        select(Invitation)
        .where(Invitation.room_id == room.id, Invitation.user_id == user.id)
        .order_by(Invitation.created_at.desc())
    )

    return RoomCandidateResponse(
        id=person.id,
        name=person.name,
        role=person.role,
        bio=person.bio,
        skill_tags=person.skill_tags,
        interests=person.interests,
        match_score=scored.score,
        reason=scored.reason,
        invitation_status=invitation.status if invitation else "none",
    )


def serialize_application(
    db: Session, application: Application, room: Room, agent: AnalysisAgent
) -> ApplicationResponse:
    return ApplicationResponse(
        id=application.id,
        applicant=serialize_candidate(db, room, application.applicant, agent),
        message=application.message,
        status=application.status,
        created_at=application.created_at,
    )


def serialize_message(message) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        sender=UserRef(id=message.sender.id, name=message.sender.name),
        content=message.content,
        created_at=message.created_at,
    )


def serialize_member_summary(db: Session, member: RoomMember) -> MemberSummaryResponse:
    profile = get_profile(db, member.user_id)
    return MemberSummaryResponse(
        id=member.user_id,
        name=member.user.name,
        role=(profile.role if profile else "") or "",
        bio=(profile.bio if profile else "") or "",
        skill_tags=(profile.skill_tags if profile else []) or [],
        is_owner=member.is_owner,
        joined_at=member.joined_at,
    )


def serialize_member_profile(db: Session, member: RoomMember) -> MemberProfileResponse:
    profile = get_profile(db, member.user_id)
    summary = serialize_member_summary(db, member)

    # 계약서 §7: 비공개 프로필은 상세 필드를 비운다.
    private = profile is not None and profile.visibility_scope == "private"

    return MemberProfileResponse(
        **summary.model_dump(by_alias=False),
        interests=[] if private or not profile else (profile.interests or []),
        collab_style="" if private or not profile else (profile.collab_style or ""),
        project_history=[] if private or not profile else (profile.project_history or []),
        social_links=None if private or not profile else (profile.social_links or None),
    )
