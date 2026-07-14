from typing import Literal

from app.schemas.base import CamelModel


class OpportunityResponse(CamelModel):
    id: str
    type: Literal["contest", "announcement"]
    status: Literal["open", "upcoming", "closed"]
    category: str
    title: str
    organizer: str
    summary: str
    image_url: str
    tags: list[str]
    deadline: str
    period: str
    eligibility: str
    benefits: list[str]
    official_url: str
    featured: bool


class OpportunityListResponse(CamelModel):
    items: list[OpportunityResponse]
