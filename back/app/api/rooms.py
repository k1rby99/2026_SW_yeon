from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Application, Invitation, Message, Room, RoomMember, User
from app.schemas.room import (
    ApplicationCreateRequest,
    ApplicationDecisionRequest,
    ApplicationResponse,
    CursorPage,
    InvitationCreateRequest,
    InvitationResponse,
    MemberProfileResponse,
    MemberSummaryResponse,
    MessageCreateRequest,
    MessageResponse,
    RoomCandidateResponse,
    RoomCreateRequest,
    RoomResponse,
    RoomUpdateRequest,
)
from app.services.analysis import AnalysisAgent, get_analysis_agent
from app.services.rooms import (
    get_room_or_404,
    membership_of,
    require_member,
    require_owner,
    serialize_application,
    serialize_candidate,
    serialize_member_profile,
    serialize_member_summary,
    serialize_message,
    serialize_room,
    view_of,
)

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

Agent = Annotated[AnalysisAgent, Depends(get_analysis_agent)]


# --- 조회 ---------------------------------------------------------------
# `/recommended`는 `/{room_id}`보다 먼저 선언해야 경로 파라미터로 흡수되지 않는다.


@router.get("/recommended", response_model=CursorPage[RoomResponse])
def recommended_rooms(
    user: CurrentUser,
    db: DbSession,
    agent: Agent,
    size: Annotated[int, Query(ge=1, le=30)] = 10,
) -> CursorPage[RoomResponse]:
    joined = select(RoomMember.room_id).where(RoomMember.user_id == user.id)
    rooms = list(
        db.scalars(
            select(Room)
            .where(Room.status == "recruiting", Room.visibility == "public", Room.id.not_in(joined))
            .order_by(Room.created_at.desc())
        )
    )

    # 후보군 형성 → 선별을 목록 전체에 대해 한 번만 돌린다. 방마다 부르면 안 된다.
    agent.recommend_rooms(view_of(db, user), rooms)

    items = [serialize_room(db, room, user, agent) for room in rooms]
    items.sort(key=lambda room: room.match_score or 0, reverse=True)
    return CursorPage[RoomResponse](items=items[:size], next_cursor=None)


@router.get("", response_model=list[RoomResponse])
def list_rooms(
    user: CurrentUser,
    db: DbSession,
    agent: Agent,
    scope: str | None = None,
    status: Literal["recruiting", "active", "ended"] | None = None,
) -> list[RoomResponse]:
    query = select(Room)
    if scope == "mine":
        joined = select(RoomMember.room_id).where(RoomMember.user_id == user.id)
        query = query.where(Room.id.in_(joined))
    else:
        query = query.where(Room.visibility == "public")
    if status:
        query = query.where(Room.status == status)

    rooms = db.scalars(query.order_by(Room.created_at.desc()))
    return [serialize_room(db, room, user, agent) for room in rooms]


@router.get("/{room_id}", response_model=RoomResponse)
def read_room(room_id: str, user: CurrentUser, db: DbSession, agent: Agent) -> RoomResponse:
    room = get_room_or_404(db, room_id)
    if room.visibility == "private" and membership_of(db, room, user.id) is None:
        raise ApiError(403, "FORBIDDEN", "초대받은 사람만 볼 수 있는 인연이에요.")

    # 상세 화면은 matchScore를 보여주므로 이 방 하나에 대해서만 추천을 돌린다.
    if membership_of(db, room, user.id) is None:
        agent.recommend_rooms(view_of(db, user), [room])

    return serialize_room(db, room, user, agent)


# --- 생성과 수정 --------------------------------------------------------


@router.post("", response_model=RoomResponse, status_code=201)
def create_room(
    payload: RoomCreateRequest, user: CurrentUser, db: DbSession, agent: Agent
) -> RoomResponse:
    room = Room(**payload.model_dump(by_alias=False), owner_id=user.id, status="recruiting")
    db.add(room)
    db.flush()

    # 방을 만든 사람은 자동으로 방장이자 첫 멤버가 된다.
    db.add(RoomMember(room_id=room.id, user_id=user.id, is_owner=True))
    db.commit()
    db.refresh(room)
    return serialize_room(db, room, user, agent)


@router.patch("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: str, payload: RoomUpdateRequest, user: CurrentUser, db: DbSession, agent: Agent
) -> RoomResponse:
    room = get_room_or_404(db, room_id)
    require_owner(db, room, user)

    data = payload.model_dump(exclude_unset=True, by_alias=False)
    if "capacity" in data and data["capacity"] is not None and data["capacity"] < room.member_count:
        raise ApiError(
            409, "CAPACITY_UNDER_MEMBER_COUNT", "현재 참여 인원보다 적은 정원으로 바꿀 수 없어요."
        )

    for key, value in data.items():
        setattr(room, key, value)

    db.commit()
    db.refresh(room)
    return serialize_room(db, room, user, agent)


# --- 참여 신청 ----------------------------------------------------------


@router.post("/{room_id}/applications", response_model=ApplicationResponse, status_code=201)
def apply_to_room(
    room_id: str,
    payload: ApplicationCreateRequest,
    user: CurrentUser,
    db: DbSession,
    agent: Agent,
) -> ApplicationResponse:
    room = get_room_or_404(db, room_id)

    if room.status != "recruiting":
        raise ApiError(409, "ROOM_NOT_RECRUITING", "모집 중인 인연이 아니에요.")
    if membership_of(db, room, user.id) is not None:
        raise ApiError(409, "ALREADY_MEMBER", "이미 참여 중인 인연이에요.")
    if room.is_full:
        raise ApiError(409, "ROOM_FULL", "인연 정원이 가득 찼어요.")

    # 계약서 §1: 같은 사용자는 한 방에 하나의 활성 신청만 가질 수 있다.
    pending = db.scalar(
        select(Application).where(
            Application.room_id == room.id,
            Application.applicant_id == user.id,
            Application.status == "pending",
        )
    )
    if pending is not None:
        raise ApiError(409, "DUPLICATE_APPLICATION", "이미 신청한 인연이에요.")

    application = Application(room_id=room.id, applicant_id=user.id, message=payload.message)

    # instant 모드는 승인 없이 바로 참여한다.
    if room.application_mode == "instant":
        application.status = "approved"
        db.add(RoomMember(room_id=room.id, user_id=user.id, is_owner=False))

    db.add(application)
    db.commit()
    db.refresh(application)
    return serialize_application(db, application, room, agent)


@router.get("/{room_id}/applications", response_model=list[ApplicationResponse])
def list_applications(
    room_id: str, user: CurrentUser, db: DbSession, agent: Agent
) -> list[ApplicationResponse]:
    room = get_room_or_404(db, room_id)
    require_owner(db, room, user)

    applications = db.scalars(
        select(Application)
        .where(Application.room_id == room.id)
        .order_by(Application.created_at.desc())
    )
    return [serialize_application(db, application, room, agent) for application in applications]


@router.patch("/{room_id}/applications/{application_id}", response_model=ApplicationResponse)
def decide_application(
    room_id: str,
    application_id: str,
    payload: ApplicationDecisionRequest,
    user: CurrentUser,
    db: DbSession,
    agent: Agent,
) -> ApplicationResponse:
    room = get_room_or_404(db, room_id)
    require_owner(db, room, user)

    application = db.get(Application, application_id)
    if application is None or application.room_id != room.id:
        raise ApiError(404, "APPLICATION_NOT_FOUND", "참여 신청을 찾을 수 없어요.")
    if application.status != "pending":
        raise ApiError(409, "APPLICATION_ALREADY_DECIDED", "이미 처리한 신청이에요.")

    if payload.action == "approve":
        # 계약서 §4: 승인 직전에 정원을 다시 확인한다.
        if room.is_full:
            raise ApiError(409, "ROOM_FULL", "인연 정원이 가득 찼어요.")
        if membership_of(db, room, application.applicant_id) is None:
            db.add(RoomMember(room_id=room.id, user_id=application.applicant_id, is_owner=False))
        application.status = "approved"
    else:
        application.status = "rejected"

    db.commit()
    db.refresh(application)
    return serialize_application(db, application, room, agent)


# --- 초대 --------------------------------------------------------------


@router.get("/{room_id}/candidates", response_model=list[RoomCandidateResponse])
def list_candidates(
    room_id: str, user: CurrentUser, db: DbSession, agent: Agent
) -> list[RoomCandidateResponse]:
    room = get_room_or_404(db, room_id)
    require_owner(db, room, user)

    joined = select(RoomMember.user_id).where(RoomMember.room_id == room.id)
    candidates = list(db.scalars(select(User).where(User.id.not_in(joined))))

    # 초대 후보도 같은 두 단계를 거친다. 후보 전체에 대해 한 번만 호출한다.
    agent.recommend_candidates(room, [view_of(db, candidate) for candidate in candidates])

    scored = [serialize_candidate(db, room, candidate, agent) for candidate in candidates]
    scored.sort(key=lambda candidate: candidate.match_score, reverse=True)
    return scored


@router.post("/{room_id}/invitations", response_model=InvitationResponse, status_code=201)
def invite_user(
    room_id: str, payload: InvitationCreateRequest, user: CurrentUser, db: DbSession
) -> Invitation:
    room = get_room_or_404(db, room_id)
    require_owner(db, room, user)

    invitee = db.get(User, payload.user_id)
    if invitee is None:
        raise ApiError(404, "USER_NOT_FOUND", "초대할 사용자를 찾을 수 없어요.")
    if membership_of(db, room, invitee.id) is not None:
        raise ApiError(409, "ALREADY_MEMBER", "이미 참여 중인 사용자예요.")

    duplicate = db.scalar(
        select(Invitation).where(
            Invitation.room_id == room.id,
            Invitation.user_id == invitee.id,
            Invitation.status == "pending",
        )
    )
    if duplicate is not None:
        raise ApiError(409, "DUPLICATE_INVITATION", "이미 초대한 사용자예요.")

    invitation = Invitation(room_id=room.id, user_id=invitee.id, message=payload.message)
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


# --- 채팅 --------------------------------------------------------------


@router.get("/{room_id}/messages", response_model=CursorPage[MessageResponse])
def list_messages(room_id: str, user: CurrentUser, db: DbSession) -> CursorPage[MessageResponse]:
    room = get_room_or_404(db, room_id)
    require_member(db, room, user)

    messages = db.scalars(
        select(Message).where(Message.room_id == room.id).order_by(Message.created_at.asc())
    )
    return CursorPage[MessageResponse](
        items=[serialize_message(message) for message in messages], next_cursor=None
    )


@router.post("/{room_id}/messages", response_model=MessageResponse, status_code=201)
def send_message(
    room_id: str, payload: MessageCreateRequest, user: CurrentUser, db: DbSession
) -> MessageResponse:
    room = get_room_or_404(db, room_id)
    require_member(db, room, user)
    if room.status == "ended":
        raise ApiError(409, "ROOM_ENDED", "종료된 인연에는 메시지를 보낼 수 없어요.")

    message = Message(room_id=room.id, sender_id=user.id, content=payload.content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return serialize_message(message)


# --- 멤버 --------------------------------------------------------------


@router.get("/{room_id}/members", response_model=list[MemberSummaryResponse])
def list_members(room_id: str, user: CurrentUser, db: DbSession) -> list[MemberSummaryResponse]:
    room = get_room_or_404(db, room_id)
    require_member(db, room, user)

    members = db.scalars(
        select(RoomMember)
        .where(RoomMember.room_id == room.id)
        .order_by(RoomMember.is_owner.desc(), RoomMember.joined_at.asc())
    )
    return [serialize_member_summary(db, member) for member in members]


@router.get("/{room_id}/members/{member_id}", response_model=MemberProfileResponse)
def read_member(
    room_id: str, member_id: str, user: CurrentUser, db: DbSession
) -> MemberProfileResponse:
    room = get_room_or_404(db, room_id)
    require_member(db, room, user)

    member = membership_of(db, room, member_id)
    if member is None:
        raise ApiError(404, "MEMBER_NOT_FOUND", "참여자를 찾을 수 없어요.")
    return serialize_member_profile(db, member)
