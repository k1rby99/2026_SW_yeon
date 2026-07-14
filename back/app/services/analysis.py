"""분석 계층의 인터페이스와 규칙 기반 목업 구현.

`AnalysisAgent`는 4개의 분석 단계를 정의한다.

1. `analyze_profile`      프로필 분석      — 사용자의 강점·협업 성향·태그를 뽑아낸다
2. `analyze_goal`         인연 목표 해석    — 자연어 목표를 방 유형·역할·키워드로 정규화한다
3. `shortlist` + `rank`   후보군 형성 → 선별 — 넓게 추린 뒤 좁게 고른다 (배치)

후보군 형성과 선별은 본질적으로 배치 작업이다. 항목마다 LLM을 호출하면 방 목록 한 번에
수십 번을 부르게 되므로, `recommend_rooms` / `recommend_candidates`가 목록을 통째로 받는다.
`score_room` / `score_candidate`는 그 배치 결과를 읽는 싸구려 조회이며, 캐시에 없으면
규칙 기반 값으로 떨어진다.

구현체:
- `MockAnalysisAgent`  규칙 기반. 결정적이라 테스트와 데모에 안정적이다.
- `AgentAnalysis`      Anthropic API 기반 (`app/agents/`). YEON_ANALYSIS_ENGINE=agent
"""

from dataclasses import dataclass, field
from typing import Protocol

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Profile, Room, User

# 키워드 → 방 유형 추론에 쓰는 힌트. 목업 전용 자산이다.
ROOM_TYPE_HINTS: dict[str, list[str]] = {
    "hackathon": ["해커톤", "hackathon", "무박", "48시간"],
    "competition": ["공모전", "대회", "경진", "competition"],
    "study": ["스터디", "study", "학습", "공부"],
    "coffee_chat": ["커피챗", "coffee", "네트워킹 대화", "멘토링"],
    "networking": ["네트워킹", "networking", "모임"],
    "project": ["프로젝트", "사이드", "project", "창업"],
}

ROLE_HINTS: dict[str, list[str]] = {
    "백엔드 개발": ["백엔드", "서버", "api", "backend", "fastapi", "spring"],
    "프론트엔드 개발": ["프론트", "frontend", "react", "ui 구현", "웹"],
    "프로덕트 디자인": ["디자인", "디자이너", "ux", "ui", "figma"],
    "데이터 분석": ["데이터", "분석", "ml", "ai", "머신러닝"],
    "기획": ["기획", "pm", "프로덕트 매니저", "서비스 기획"],
}

DEFAULT_ROLES = ["백엔드 개발", "프로덕트 디자인"]

# "React 개발자"와 "백엔드 개발자"가 '개발자'만으로 매칭되는 것을 막는다.
GENERIC_ROLE_WORDS = {"개발자", "개발", "디자이너", "디자인", "분석가", "분석", "기획자", "기획", "매니저", "엔지니어"}

ROOM_TYPES = ("competition", "hackathon", "study", "project", "coffee_chat", "networking")


# --- 분석 계층이 주고받는 값 ------------------------------------------------


@dataclass
class Strength:
    key: str
    label: str
    level: int  # 1~3


@dataclass
class ProfileInsight:
    """프로필 분석 에이전트의 결과. Profile.insight에 저장된다."""

    summary: str
    collaboration_style: str
    derived_tags: list[str] = field(default_factory=list)
    strengths: list[Strength] = field(default_factory=list)

    def to_json(self) -> dict:
        return {
            "summary": self.summary,
            "collaborationStyle": self.collaboration_style,
            "derivedTags": self.derived_tags,
            "strengths": [{"key": s.key, "label": s.label, "level": s.level} for s in self.strengths],
        }


@dataclass
class GoalAnalysisResult:
    normalized_goal: str
    keywords: list[str]
    suggested_room_type: str
    suggested_roles: list[str]
    recommended_room_ids: list[str] = field(default_factory=list)


@dataclass
class CandidateScore:
    score: int
    reason: str


@dataclass
class PersonView:
    """분석에 넘기는 사람 한 명의 요약. ORM을 에이전트 안으로 끌고 들어가지 않기 위한 경계."""

    id: str
    name: str
    role: str = ""
    bio: str = ""
    collab_style: str = ""
    summary: str = ""
    skill_tags: list[str] = field(default_factory=list)
    interests: list[str] = field(default_factory=list)


def person_view(user: User, profile: Profile | None) -> PersonView:
    insight = (profile.insight or {}) if profile else {}
    return PersonView(
        id=user.id,
        name=user.name,
        role=(profile.role if profile else "") or "",
        bio=(profile.bio if profile else "") or "",
        collab_style=(profile.collab_style if profile else "") or "",
        summary=insight.get("summary", ""),
        skill_tags=(profile.skill_tags if profile else []) or [],
        interests=(profile.interests if profile else []) or [],
    )


class AnalysisAgent(Protocol):
    def analyze_profile(self, person: PersonView) -> ProfileInsight: ...

    def analyze_goal(self, text: str, keywords: list[str], rooms: list[Room]) -> GoalAnalysisResult: ...

    def recommend_rooms(self, viewer: PersonView | None, rooms: list[Room]) -> dict[str, CandidateScore]:
        """후보군 형성 → 선별. room_id로 키를 잡은 점수/이유 표를 돌려준다."""
        ...

    def recommend_candidates(self, room: Room, people: list[PersonView]) -> dict[str, CandidateScore]:
        """같은 두 단계를 초대 후보에 적용한다. user_id로 키를 잡는다."""
        ...

    def recommend_people(self, viewer: PersonView, people: list[PersonView]) -> dict[str, CandidateScore]:
        """방과 무관한 1:1 추천. 상호보완(내게 없는 역량을 상대가 가짐)이 판단 기준이다."""
        ...

    def score_room(self, viewer: PersonView | None, room: Room) -> int | None:
        """단건 조회용 싸구려 점수. 배치 결과가 있으면 그걸 쓴다."""
        ...

    def score_candidate(self, room: Room, person: PersonView) -> CandidateScore: ...

    def score_person(self, viewer: PersonView, person: PersonView) -> CandidateScore: ...


def gap_tags(viewer: PersonView, person: PersonView) -> list[str]:
    """상대는 가졌고 나는 갖지 못한 역량. 상호보완의 근거로 화면에 보인다."""
    mine = {tag.lower() for tag in viewer.skill_tags}
    return [tag for tag in person.skill_tags if tag.lower() not in mine]


# --- 규칙 기반 헬퍼 ---------------------------------------------------------


def _tokens(*sources: object) -> set[str]:
    """문자열과 문자열 리스트를 소문자 토큰 집합으로 편다."""
    bag: set[str] = set()
    for source in sources:
        if isinstance(source, str):
            bag.update(part for part in source.lower().replace(",", " ").split() if part)
        elif isinstance(source, list):
            for item in source:
                if isinstance(item, str):
                    bag.add(item.lower().strip())
    return {token for token in bag if token}


def _matches_role(role: str, owned: set[str]) -> bool:
    """역할 이름에서 '개발자' 같은 흔한 말을 걷어낸 뒤, 남은 핵심 단어로만 판단한다."""
    distinctive = {token for token in _tokens(role) if token not in GENERIC_ROLE_WORDS}
    if not distinctive:
        return False
    return _overlap_score(distinctive, owned) > 0


def _overlap_score(left: set[str], right: set[str]) -> float:
    """두 토큰 집합의 겹침 비율(0~1). 한쪽이 비면 0."""
    if not left or not right:
        return 0.0
    hits = sum(1 for token in left if any(token in other or other in token for other in right))
    return hits / len(left)


class MockAnalysisAgent:
    """규칙 기반 목업. 결정적으로 동작해서 테스트와 데모에 안정적이다."""

    def analyze_profile(self, person: PersonView) -> ProfileInsight:
        strengths = [
            Strength(key=tag.lower().replace(" ", "-"), label=tag, level=3 - min(index, 2))
            for index, tag in enumerate(person.skill_tags[:5])
        ]
        headline = person.role or "협업자"
        return ProfileInsight(
            summary=person.bio or f"{', '.join(person.skill_tags[:3]) or '다양한'} 역량을 가진 {headline}입니다.",
            collaboration_style=person.collab_style or "함께 목표를 맞추고 자주 공유하는 협업을 선호해요.",
            derived_tags=list(dict.fromkeys([*person.skill_tags, *person.interests]))[:8],
            strengths=strengths,
        )

    def analyze_goal(self, text: str, keywords: list[str], rooms: list[Room]) -> GoalAnalysisResult:
        haystack = " ".join([text, *keywords]).lower()

        room_type = "project"
        for candidate_type, hints in ROOM_TYPE_HINTS.items():
            if any(hint in haystack for hint in hints):
                room_type = candidate_type
                break

        roles = [role for role, hints in ROLE_HINTS.items() if any(hint in haystack for hint in hints)]

        goal_tokens = _tokens(text, keywords)
        ranked = sorted(
            rooms,
            key=lambda room: _overlap_score(goal_tokens, _tokens(room.title, room.summary, room.tags)),
            reverse=True,
        )

        merged_keywords = list(dict.fromkeys([*keywords, "협업", "상호보완"]))

        if text.strip():
            normalized = text.strip()
        elif keywords:
            normalized = f"{' · '.join(keywords)} 인연 찾기"
        else:
            normalized = "인연 찾기"

        return GoalAnalysisResult(
            normalized_goal=normalized,
            keywords=merged_keywords,
            suggested_room_type=room_type,
            suggested_roles=roles or DEFAULT_ROLES,
            recommended_room_ids=[room.id for room in ranked],
        )

    def recommend_rooms(self, viewer: PersonView | None, rooms: list[Room]) -> dict[str, CandidateScore]:
        result: dict[str, CandidateScore] = {}
        for room in rooms:
            score = self.score_room(viewer, room)
            if score is None:
                continue
            result[room.id] = CandidateScore(score=score, reason="관심사와 방의 주제가 겹쳐요.")
        return result

    def recommend_candidates(self, room: Room, people: list[PersonView]) -> dict[str, CandidateScore]:
        return {person.id: self.score_candidate(room, person) for person in people}

    def recommend_people(self, viewer: PersonView, people: list[PersonView]) -> dict[str, CandidateScore]:
        return {person.id: self.score_person(viewer, person) for person in people}

    def score_person(self, viewer: PersonView, person: PersonView) -> CandidateScore:
        gaps = gap_tags(viewer, person)
        shared = _overlap_score(_tokens(viewer.interests), _tokens(person.interests))

        # 상호보완(내게 없는 역량)이 절반, 관심사 겹침이 절반이다.
        complement = min(len(gaps), 3) / 3
        score = round(55 + complement * 25 + shared * 18)

        if gaps:
            reason = (
                f"회원님이 갖고 있지 않은 '{', '.join(gaps[:2])}' 역량을 보유해 서로를 보완할 수 있어요."
            )
        elif shared > 0:
            reason = "관심 분야가 겹쳐 이야기가 잘 통할 거예요."
        else:
            reason = "새로운 관점을 더해줄 수 있는 분이에요."

        return CandidateScore(score=score, reason=reason)

    def score_room(self, viewer: PersonView | None, room: Room) -> int | None:
        if viewer is None:
            return None
        viewer_tokens = _tokens(viewer.interests, viewer.skill_tags)
        room_tokens = _tokens(room.tags, room.required_roles, room.title)
        if not viewer_tokens or not room_tokens:
            return None
        # 60~98 사이로 눌러 담아 목업 점수가 0점처럼 보이지 않게 한다.
        return round(60 + _overlap_score(room_tokens, viewer_tokens) * 38)

    def score_candidate(self, room: Room, person: PersonView) -> CandidateScore:
        needed = _tokens(room.required_roles, room.tags)
        owned = _tokens(person.skill_tags, person.interests, person.role)
        overlap = _overlap_score(needed, owned)
        score = round(60 + overlap * 38)

        matched = [role for role in room.required_roles if _matches_role(role, owned)]
        if matched:
            reason = f"필요 역할인 {', '.join(matched)} 역량이 프로필과 맞닿아 있어요."
        elif overlap > 0:
            reason = "방의 주제와 관심사가 겹쳐 협업 접점이 있어요."
        else:
            reason = "현재 팀에 없는 역량을 갖고 있어 구성을 보완할 수 있어요."

        return CandidateScore(score=score, reason=reason)


def get_analysis_agent(db: Session = Depends(get_db)) -> AnalysisAgent:
    """FastAPI 의존성. 엔진 교체는 여기 한 곳만 바꾼다."""
    if settings.analysis_engine == "agent":
        # 지연 임포트: mock으로 돌릴 때는 anthropic 패키지가 없어도 동작한다.
        from app.agents.pipeline import AgentAnalysis
        from app.services.score_cache import DbScoreCache

        return AgentAnalysis(fallback=MockAnalysisAgent(), cache=DbScoreCache(db))
    # 규칙 기반은 계산이 싸므로 캐시할 이유가 없다.
    return MockAnalysisAgent()
