from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel, IsoDatetime
from app.schemas.room import RoomType


class GoalAnalyzeRequest(CamelModel):
    text: str = ""
    keywords: list[str] = Field(default_factory=list)


class GoalAnalysisResponse(CamelModel):
    id: str
    normalized_goal: str
    keywords: list[str]
    suggested_room_type: RoomType
    suggested_roles: list[str]
    recommended_room_ids: list[str]


class GoalCreateRequest(CamelModel):
    text: str = Field(min_length=1)
    category: str = ""


class GoalResponse(CamelModel):
    id: str
    text: str
    category: str
    status: Literal["processing", "completed", "failed"]
    created_at: IsoDatetime
