"""인연 방 이전의 1:1 매칭 계열 엔드포인트.

추천은 저장하지 않고 요청 시점에 계산한다. 추천 id는 `rec-{상대 user_id}`로 결정되므로
상세 조회와 수락/거절이 목록 응답 없이도 성립한다.

점수와 이유는 인연 방 추천과 같은 두 에이전트(후보군 형성 → 선별)를 사람에 적용해 얻는다.
"""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Feedback, Match, RecommendationAction, User, utcnow
from app.schemas.matching import (
    FeedbackRequest,
    FeedbackResponse,
    MatchResponse,
    ProfileSummary,
    RecommendationActionRequest,
    RecommendationActionResponse,
    RecommendationPage,
    RecommendationResponse,
)
from app.services.analysis import AnalysisAgent, CandidateScore, gap_tags, get_analysis_agent
from app.services.rooms import view_of

router = APIRouter(prefix="/api", tags=["matching"])

Agent = Annotated[AnalysisAgent, Depends(get_analysis_agent)]

REC_PREFIX = "rec-"


def _summary(person) -> ProfileSummary:
    return ProfileSummary(interests=person.interests, skill_tags=person.skill_tags)


def _open_candidates(db: DbSession, user: User) -> list[User]:
    """아직 수락/거절하지 않은 다른 사용자들."""
    actioned = select(RecommendationAction.candidate_id).where(RecommendationAction.user_id == user.id)
    return list(db.scalars(select(User).where(User.id != user.id, User.id.not_in(actioned))))


def _to_recommendation(viewer, person, scored: CandidateScore, created_at) -> RecommendationResponse:
    return RecommendationResponse(
        id=f"{REC_PREFIX}{person.id}",
        candidate_id=person.id,
        candidate_profile_summary=_summary(person),
        complement_score=scored.score,
        gap_tags=gap_tags(viewer, person),
        reason_text=scored.reason,
        created_at=created_at,
    )


# --- 추천 --------------------------------------------------------------


@router.get("/recommendations", response_model=RecommendationPage)
def list_recommendations(
    user: CurrentUser,
    db: DbSession,
    agent: Agent,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=30)] = 6,
) -> RecommendationPage:
    viewer = view_of(db, user)
    candidates = _open_candidates(db, user)

    scores = agent.recommend_people(viewer, [view_of(db, candidate) for candidate in candidates])

    items = [
        _to_recommendation(viewer, view_of(db, candidate), scores[candidate.id], candidate.created_at)
        for candidate in candidates
        if candidate.id in scores
    ]
    items.sort(key=lambda item: item.complement_score, reverse=True)

    start = (page - 1) * size
    window = items[start : start + size]
    return RecommendationPage(
        items=window,
        page=page,
        size=size,
        has_more=start + size < len(items),
    )


def _candidate_from_rec_id(db: DbSession, recommendation_id: str) -> User:
    if not recommendation_id.startswith(REC_PREFIX):
        raise ApiError(404, "RECOMMENDATION_NOT_FOUND", "추천을 찾을 수 없어요.")
    candidate = db.get(User, recommendation_id[len(REC_PREFIX) :])
    if candidate is None:
        raise ApiError(404, "RECOMMENDATION_NOT_FOUND", "추천을 찾을 수 없어요.")
    return candidate


@router.get("/recommendations/{recommendation_id}", response_model=RecommendationResponse)
def read_recommendation(
    recommendation_id: str, user: CurrentUser, db: DbSession, agent: Agent
) -> RecommendationResponse:
    candidate = _candidate_from_rec_id(db, recommendation_id)
    if candidate.id == user.id:
        raise ApiError(404, "RECOMMENDATION_NOT_FOUND", "추천을 찾을 수 없어요.")

    viewer = view_of(db, user)
    person = view_of(db, candidate)

    agent.recommend_people(viewer, [person])
    scored = agent.score_person(viewer, person)

    return _to_recommendation(viewer, person, scored, candidate.created_at)


@router.post("/recommendations/{recommendation_id}/action", response_model=RecommendationActionResponse)
def act_on_recommendation(
    recommendation_id: str,
    payload: RecommendationActionRequest,
    user: CurrentUser,
    db: DbSession,
) -> RecommendationActionResponse:
    candidate = _candidate_from_rec_id(db, recommendation_id)
    if candidate.id == user.id:
        raise ApiError(400, "INVALID_RECOMMENDATION", "자기 자신은 추천 대상이 아니에요.")

    existing = db.scalar(
        select(RecommendationAction).where(
            RecommendationAction.user_id == user.id,
            RecommendationAction.candidate_id == candidate.id,
        )
    )
    if existing is not None:
        raise ApiError(409, "ALREADY_ACTIONED", "이미 처리한 추천이에요.")

    db.add(RecommendationAction(user_id=user.id, candidate_id=candidate.id, action=payload.action))

    if payload.action == "accept":
        db.add(Match(user_id=user.id, counterpart_id=candidate.id, status="active"))

    db.commit()
    return RecommendationActionResponse(id=recommendation_id, action=payload.action)


# --- 매칭 --------------------------------------------------------------


@router.get("/matches", response_model=list[MatchResponse])
def list_matches(
    user: CurrentUser,
    db: DbSession,
    status: Literal["active", "ended"] | None = None,
) -> list[MatchResponse]:
    query = select(Match).where(or_(Match.user_id == user.id, Match.counterpart_id == user.id))
    if status:
        query = query.where(Match.status == status)

    result = []
    for match in db.scalars(query.order_by(Match.started_at.desc())):
        # 내가 어느 쪽이든 '상대'는 나머지 한 명이다.
        other_id = match.counterpart_id if match.user_id == user.id else match.user_id
        other = db.get(User, other_id)
        if other is None:
            continue
        result.append(
            MatchResponse(
                id=match.id,
                counterpart_id=other.id,
                counterpart_summary=_summary(view_of(db, other)),
                status=match.status,
                started_at=match.started_at,
                ended_at=match.ended_at,
            )
        )
    return result


@router.patch("/matches/{match_id}", response_model=MatchResponse)
def end_match(match_id: str, user: CurrentUser, db: DbSession) -> MatchResponse:
    match = db.get(Match, match_id)
    if match is None or user.id not in (match.user_id, match.counterpart_id):
        raise ApiError(404, "MATCH_NOT_FOUND", "매칭을 찾을 수 없어요.")
    if match.status == "ended":
        raise ApiError(409, "MATCH_ALREADY_ENDED", "이미 종료된 매칭이에요.")

    match.status = "ended"
    match.ended_at = utcnow()
    db.commit()
    db.refresh(match)

    other_id = match.counterpart_id if match.user_id == user.id else match.user_id
    other = db.get(User, other_id)
    return MatchResponse(
        id=match.id,
        counterpart_id=other.id,
        counterpart_summary=_summary(view_of(db, other)),
        status=match.status,
        started_at=match.started_at,
        ended_at=match.ended_at,
    )


# --- 피드백 ------------------------------------------------------------


@router.post("/feedback", response_model=FeedbackResponse, status_code=201)
def submit_feedback(payload: FeedbackRequest, user: CurrentUser, db: DbSession) -> Feedback:
    match = db.get(Match, payload.match_id)
    if match is None or user.id not in (match.user_id, match.counterpart_id):
        raise ApiError(404, "MATCH_NOT_FOUND", "매칭을 찾을 수 없어요.")

    feedback = Feedback(
        user_id=user.id,
        match_id=match.id,
        satisfaction_score=payload.satisfaction_score,
        comment=payload.comment or "",
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
