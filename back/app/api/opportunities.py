from typing import Literal

from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Opportunity
from app.schemas.opportunity import OpportunityListResponse, OpportunityResponse

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


@router.get("", response_model=OpportunityListResponse)
def list_opportunities(
    user: CurrentUser,
    db: DbSession,
    type: Literal["contest", "announcement"] | None = None,
    featured: bool = False,
) -> OpportunityListResponse:
    query = select(Opportunity)
    if type:
        query = query.where(Opportunity.type == type)
    if featured:
        query = query.where(Opportunity.featured.is_(True))

    items = db.scalars(query.order_by(Opportunity.deadline.asc()))
    return OpportunityListResponse(items=[OpportunityResponse.model_validate(item) for item in items])


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def read_opportunity(opportunity_id: str, user: CurrentUser, db: DbSession) -> Opportunity:
    opportunity = db.get(Opportunity, opportunity_id)
    if opportunity is None:
        raise ApiError(404, "OPPORTUNITY_NOT_FOUND", "공고를 찾을 수 없어요.")
    return opportunity
