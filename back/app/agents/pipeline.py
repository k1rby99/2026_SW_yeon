"""4개 에이전트를 묶어 `AnalysisAgent` 프로토콜을 구현한다.

추천 흐름:

    후보군 형성(shortlist, effort=low)  →  대상 선별(selection, effort=high)

넓게 추린 뒤 좁게 고른다. 전체 목록을 바로 선별 에이전트에 넣지 않는 이유는 두 가지다.
목록이 길수록 토큰이 선형으로 늘고, 관련 없는 항목이 섞이면 선별 품질이 떨어진다.

에이전트 호출이 실패하면(키 없음, 레이트 리밋, 거절) 규칙 기반 목업으로 떨어진다.
`YEON_ANALYSIS_FALLBACK=false`로 두면 대신 예외를 그대로 올린다.
"""

from __future__ import annotations

import logging

from app.agents import goal_agent, profile_agent, selection_agent, shortlist_agent
from app.agents.base import AgentUnavailable
from app.core.config import settings
from app.models import Room
from app.services.analysis import (
    AnalysisAgent,
    CandidateScore,
    GoalAnalysisResult,
    PersonView,
    ProfileInsight,
)
from app.services.score_cache import DbScoreCache, fingerprint_of, scope_of

logger = logging.getLogger(__name__)


def _room_payload(room: Room) -> dict:
    return {
        "id": room.id,
        "title": room.title,
        "type": room.type,
        "summary": room.summary,
        "tags": room.tags,
        "requiredRoles": room.required_roles,
        "memberCount": room.member_count,
        "capacity": room.capacity,
        "meetingStyle": room.meeting_style,
        "deadline": room.deadline,
    }


def _person_payload(person: PersonView) -> dict:
    return {
        "id": person.id,
        "name": person.name,
        "role": person.role,
        "bio": person.bio,
        "collabStyle": person.collab_style,
        "summary": person.summary,
        "skillTags": person.skill_tags,
        "interests": person.interests,
    }


class AgentAnalysis:
    """Anthropic API 기반 분석.

    캐시가 두 겹이다.
    - DB 캐시(`cache`): 요청 사이에 남는다. 입력이 그대로면 에이전트를 아예 부르지 않는다.
    - 인메모리 캐시: 요청 하나 안에서 배치 결과를 단건 조회(`score_room` 등)가 다시 쓴다.
    """

    def __init__(self, fallback: AnalysisAgent, cache: DbScoreCache | None = None) -> None:
        self._fallback = fallback
        self._cache = cache
        self._room_scores: dict[str, CandidateScore] = {}
        self._candidate_scores: dict[tuple[str, str], CandidateScore] = {}
        self._people_scores: dict[str, CandidateScore] = {}

    # --- 실패 처리 --------------------------------------------------------

    def _degrade(self, stage: str, error: AgentUnavailable):
        if not settings.analysis_fallback:
            raise error
        logger.warning("에이전트(%s) 실패 — 규칙 기반으로 대체합니다: %s", stage, error)

    # --- 1. 프로필 분석 ---------------------------------------------------

    def analyze_profile(self, person: PersonView) -> ProfileInsight:
        try:
            return profile_agent.analyze_profile(person)
        except AgentUnavailable as error:
            self._degrade("profile", error)
            return self._fallback.analyze_profile(person)

    # --- 2. 목표 해석 -----------------------------------------------------

    def analyze_goal(self, text: str, keywords: list[str], rooms: list[Room]) -> GoalAnalysisResult:
        try:
            return goal_agent.analyze_goal(text, keywords, rooms)
        except AgentUnavailable as error:
            self._degrade("goal", error)
            return self._fallback.analyze_goal(text, keywords, rooms)

    # --- 3+4. 후보군 형성 → 선별 -------------------------------------------

    def _batch(
        self,
        *,
        kind: str,
        cache_owner: str,
        seeker: dict,
        items: list[dict],
        shortlist_subject: str,
        select_subject: str,
        fallback,
    ) -> dict[str, CandidateScore]:
        """후보군 형성 → 선별. 같은 입력이면 DB 캐시를 읽고 에이전트를 부르지 않는다.

        cache_owner는 캐시의 주인이다. 방 추천·1:1 추천은 '보는 사람', 초대 후보는 '방'이
        주인이 된다. 방장이 바뀌어도 방의 초대 후보 캐시는 유지된다.
        """
        scope = scope_of(items)
        fingerprint = fingerprint_of(seeker, items)

        if self._cache is not None:
            hit = self._cache.get(cache_owner, kind, scope, fingerprint)
            if hit is not None:
                logger.info("추천 캐시 적중 kind=%s owner=%s", kind, cache_owner)
                return hit

        try:
            kept = shortlist_agent.shortlist(subject=shortlist_subject, seeker=seeker, items=items)
            scored = selection_agent.select(
                subject=select_subject,
                seeker=seeker,
                candidates=[item for item in items if item["id"] in set(kept)],
            )
        except AgentUnavailable as error:
            self._degrade(kind, error)
            # 규칙 기반 결과는 캐시하지 않는다. 키가 돌아오면 다시 에이전트로 계산해야 한다.
            return fallback()

        if self._cache is not None:
            self._cache.put(cache_owner, kind, scope, fingerprint, scored)
        return scored

    def recommend_rooms(self, viewer: PersonView | None, rooms: list[Room]) -> dict[str, CandidateScore]:
        if viewer is None or not rooms:
            return {}

        scored = self._batch(
            kind="room",
            cache_owner=viewer.id,
            seeker=_person_payload(viewer),
            items=[_room_payload(room) for room in rooms],
            shortlist_subject="이 사용자가 참여하면 좋을 인연 방 고르기",
            select_subject="이 사용자에게 각 인연 방이 얼마나 맞는지 평가하기",
            fallback=lambda: self._fallback.recommend_rooms(viewer, rooms),
        )

        self._room_scores.update(scored)
        return scored

    def recommend_candidates(self, room: Room, people: list[PersonView]) -> dict[str, CandidateScore]:
        if not people:
            return {}

        scored = self._batch(
            kind="candidate",
            cache_owner=room.id,
            seeker=_room_payload(room),
            items=[_person_payload(person) for person in people],
            shortlist_subject="이 방에 초대할 만한 사람 고르기",
            select_subject="이 방의 목표와 지금 팀 구성에 비추어, 각 후보가 얼마나 보탬이 되는지 평가하기",
            fallback=lambda: self._fallback.recommend_candidates(room, people),
        )

        for person_id, score in scored.items():
            self._candidate_scores[(room.id, person_id)] = score
        return scored

    def recommend_people(self, viewer: PersonView, people: list[PersonView]) -> dict[str, CandidateScore]:
        if not people:
            return {}

        scored = self._batch(
            kind="person",
            cache_owner=viewer.id,
            seeker=_person_payload(viewer),
            items=[_person_payload(person) for person in people],
            shortlist_subject="이 사용자와 함께하면 좋을 사람 고르기",
            select_subject=(
                "이 사용자에게 각 후보가 얼마나 상호보완적인지 평가하기. "
                "사용자가 갖지 못한 역량을 후보가 가졌는지를 특히 중요하게 보세요."
            ),
            fallback=lambda: self._fallback.recommend_people(viewer, people),
        )

        self._people_scores.update(scored)
        return scored

    # --- 단건 조회 --------------------------------------------------------
    # 배치 결과를 읽기만 한다. 방 하나 직렬화할 때마다 LLM을 부르면 목록 한 번에
    # 수십 번을 호출하게 되므로, 캐시에 없으면 규칙 기반 값으로 떨어진다.

    def score_room(self, viewer: PersonView | None, room: Room) -> int | None:
        cached = self._room_scores.get(room.id)
        if cached is not None:
            return cached.score
        return self._fallback.score_room(viewer, room)

    def score_candidate(self, room: Room, person: PersonView) -> CandidateScore:
        cached = self._candidate_scores.get((room.id, person.id))
        if cached is not None:
            return cached
        return self._fallback.score_candidate(room, person)

    def score_person(self, viewer: PersonView, person: PersonView) -> CandidateScore:
        cached = self._people_scores.get(person.id)
        if cached is not None:
            return cached
        return self._fallback.score_person(viewer, person)
