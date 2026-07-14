"""인연 방 이전의 1:1 매칭 계열 스키마. 프론트 `types/domain.ts`를 그대로 따른다."""

from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel, IsoDatetime


class ProfileSummary(CamelModel):
    interests: list[str]
    skill_tags: list[str]


class RecommendationResponse(CamelModel):
    id: str
    candidate_id: str
    candidate_profile_summary: ProfileSummary
    complement_score: int  # 0~100
    gap_tags: list[str]
    reason_text: str
    created_at: IsoDatetime


class RecommendationPage(CamelModel):
    items: list[RecommendationResponse]
    page: int
    size: int
    has_more: bool


class RecommendationActionRequest(CamelModel):
    action: Literal["accept", "reject"]


class RecommendationActionResponse(CamelModel):
    id: str
    action: Literal["accept", "reject"]


class MatchResponse(CamelModel):
    id: str
    counterpart_id: str
    counterpart_summary: ProfileSummary
    status: Literal["active", "ended"]
    started_at: IsoDatetime
    ended_at: IsoDatetime | None = None


class FeedbackRequest(CamelModel):
    match_id: str
    satisfaction_score: int = Field(ge=1, le=5)
    comment: str | None = None


class FeedbackResponse(CamelModel):
    id: str
    match_id: str
    satisfaction_score: int
    comment: str | None = None
    created_at: IsoDatetime
