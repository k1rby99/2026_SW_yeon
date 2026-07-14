from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Profile
from app.schemas.profile import ProfileResponse, ProfileUpsertRequest
from app.services.analysis import AnalysisAgent, get_analysis_agent, person_view
from app.services.rooms import get_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])

Agent = Annotated[AnalysisAgent, Depends(get_analysis_agent)]


def _apply(profile: Profile, payload: ProfileUpsertRequest) -> Profile:
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    for key, value in data.items():
        if key == "strengths" and value is not None:
            profile.strengths = [s if isinstance(s, dict) else s.model_dump() for s in value]
        elif key == "social_links":
            profile.social_links = value or {}
        else:
            setattr(profile, key, value)
    return profile


def _analyze(db: DbSession, profile: Profile, user, agent: AnalysisAgent) -> None:
    """프로필 분석 에이전트를 돌려 요약·강점을 채운다.

    사용자가 강점을 직접 적었다면 덮어쓰지 않는다. 분석은 사용자의 입력을 보완하는 것이지
    대체하는 것이 아니다.
    """
    insight = agent.analyze_profile(person_view(user, profile))
    profile.insight = insight.to_json()
    if not profile.strengths:
        profile.strengths = [
            {"key": s.key, "label": s.label, "level": s.level} for s in insight.strengths
        ]


@router.get("", response_model=ProfileResponse)
def read_profile(user: CurrentUser, db: DbSession) -> Profile:
    profile = get_profile(db, user.id)
    if profile is None:
        # 프론트 useProfile은 404를 "온보딩 미완료"로 해석한다.
        raise ApiError(404, "PROFILE_NOT_FOUND", "아직 프로필이 없어요.")
    return profile


@router.post("", response_model=ProfileResponse, status_code=201)
def create_profile(
    payload: ProfileUpsertRequest, user: CurrentUser, db: DbSession, agent: Agent
) -> Profile:
    profile = get_profile(db, user.id)
    if profile is None:
        profile = Profile(user_id=user.id)
        db.add(profile)

    _apply(profile, payload)
    # 온보딩 제출은 곧 완료를 뜻한다.
    if payload.onboarding_completed is None:
        profile.onboarding_completed = True

    _analyze(db, profile, user, agent)

    db.commit()
    db.refresh(profile)
    return profile


@router.patch("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpsertRequest, user: CurrentUser, db: DbSession, agent: Agent
) -> Profile:
    profile = get_profile(db, user.id)
    if profile is None:
        raise ApiError(404, "PROFILE_NOT_FOUND", "아직 프로필이 없어요.")

    _apply(profile, payload)
    _analyze(db, profile, user, agent)

    db.commit()
    db.refresh(profile)
    return profile
