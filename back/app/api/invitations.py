"""내가 받은 초대.

방장이 보내는 초대(`POST /api/rooms/{id}/invitations`)는 rooms 라우터에 있다. 여기는 그 반대편,
초대받은 사람이 초대를 확인하고 수락하거나 거절하는 쪽이다. 이게 없으면 초대는
보내지기만 하고 영원히 `pending`으로 남는다.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Invitation, Room, RoomMember, User
from app.schemas.room import (
    InvitationDecisionRequest,
    ReceivedInvitationResponse,
    UserRef,
)
from app.services.analysis import AnalysisAgent, get_analysis_agent
from app.services.rooms import membership_of, serialize_room

router = APIRouter(prefix="/api/invitations", tags=["invitations"])

Agent = Annotated[AnalysisAgent, Depends(get_analysis_agent)]


def _serialize(db: DbSession, invitation: Invitation, user: User, agent: AnalysisAgent):
    return ReceivedInvitationResponse(
        id=invitation.id,
        status=invitation.status,
        message=invitation.message,
        created_at=invitation.created_at,
        room=serialize_room(db, invitation.room, user, agent),
        inviter=UserRef(id=invitation.room.owner.id, name=invitation.room.owner.name),
    )


@router.get("", response_model=list[ReceivedInvitationResponse])
def list_received_invitations(
    user: CurrentUser, db: DbSession, agent: Agent
) -> list[ReceivedInvitationResponse]:
    """아직 답하지 않은 초대만 보여준다. 거절한 초대를 계속 띄울 이유가 없다."""
    invitations = db.scalars(
        select(Invitation)
        .where(Invitation.user_id == user.id, Invitation.status == "pending")
        .order_by(Invitation.created_at.desc())
    )
    return [_serialize(db, invitation, user, agent) for invitation in invitations]


@router.patch("/{invitation_id}", response_model=ReceivedInvitationResponse)
def decide_invitation(
    invitation_id: str,
    payload: InvitationDecisionRequest,
    user: CurrentUser,
    db: DbSession,
    agent: Agent,
) -> ReceivedInvitationResponse:
    invitation = db.get(Invitation, invitation_id)
    if invitation is None or invitation.user_id != user.id:
        raise ApiError(404, "INVITATION_NOT_FOUND", "초대를 찾을 수 없어요.")
    if invitation.status != "pending":
        raise ApiError(409, "INVITATION_ALREADY_DECIDED", "이미 처리한 초대예요.")

    room: Room = invitation.room

    if payload.action == "accept":
        if room.status == "ended":
            raise ApiError(409, "ROOM_ENDED", "이미 종료된 인연이에요.")
        if membership_of(db, room, user.id) is None:
            # 수락 직전에 정원을 다시 확인한다. 초대받은 사이에 자리가 찼을 수 있다.
            if room.is_full:
                raise ApiError(409, "ROOM_FULL", "인연 정원이 가득 찼어요.")
            db.add(RoomMember(room_id=room.id, user_id=user.id, is_owner=False))
        invitation.status = "accepted"
    else:
        invitation.status = "declined"

    db.commit()
    db.refresh(invitation)
    return _serialize(db, invitation, user, agent)
