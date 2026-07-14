from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel

VisibilityScope = Literal["public", "limited", "private"]


class SocialLinks(CamelModel):
    blog: str | None = None
    instagram: str | None = None
    github: str | None = None


class Strength(CamelModel):
    key: str
    label: str
    level: Literal[1, 2, 3]


class ProfileResponse(CamelModel):
    id: str
    user_id: str
    interests: list[str]
    skill_tags: list[str]
    collab_style: str
    project_history: list[str]
    visibility_scope: VisibilityScope
    onboarding_completed: bool
    bio: str | None = None
    role: str | None = None
    strengths: list[Strength] = Field(default_factory=list)
    social_links: SocialLinks | None = None
    # 프로필 분석 에이전트의 산출물. 프론트가 아직 쓰지 않지만 응답에 실어 보낸다.
    insight: dict | None = None


class ProfileUpsertRequest(CamelModel):
    """POST(생성)와 PATCH(부분 수정)를 함께 처리하므로 모든 필드가 선택적이다."""

    interests: list[str] | None = None
    skill_tags: list[str] | None = None
    collab_style: str | None = None
    project_history: list[str] | None = None
    visibility_scope: VisibilityScope | None = None
    onboarding_completed: bool | None = None
    bio: str | None = None
    role: str | None = None
    strengths: list[Strength] | None = None
    social_links: SocialLinks | None = None
