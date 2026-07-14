"""에이전트 파이프라인 테스트.

실제 Claude를 부르지 않는다. `run_agent`를 가짜로 갈아끼워 파이프라인의 배선과 방어 로직만
검증한다: 후보군 형성 → 선별 순서, 환각 id 걸러내기, 점수 클램핑, 실패 시 폴백.

실제 API를 태우는 검증은 `scripts/agent_smoke.py`가 담당한다(키 필요).
"""

import pytest

from app.agents import goal_agent, pipeline, profile_agent, selection_agent, shortlist_agent
from app.agents.base import AgentUnavailable
from app.agents.pipeline import AgentAnalysis
from app.models import Room
from app.services.analysis import MockAnalysisAgent, PersonView


@pytest.fixture()
def agent() -> AgentAnalysis:
    return AgentAnalysis(fallback=MockAnalysisAgent())


@pytest.fixture()
def viewer() -> PersonView:
    return PersonView(
        id="user-me",
        name="나",
        role="프론트엔드 개발자",
        bio="모바일 경험을 만듭니다.",
        skill_tags=["React", "TypeScript"],
        interests=["모바일", "AI"],
    )


def make_room(room_id: str, title: str = "테스트 방") -> Room:
    return Room(
        id=room_id,
        title=title,
        type="project",
        summary="요약",
        tags=["AI"],
        required_roles=["백엔드"],
        status="recruiting",
        capacity=5,
        owner_id="user-1",
        meeting_style="online",
    )


def test_falls_back_to_mock_when_agent_unavailable(agent: AgentAnalysis, viewer: PersonView, monkeypatch):
    """키가 없거나 API가 죽어도 화면이 비지 않는다."""

    def boom(*args, **kwargs):
        raise AgentUnavailable("no credentials")

    monkeypatch.setattr(shortlist_agent, "shortlist", boom)
    monkeypatch.setattr(profile_agent, "analyze_profile", boom)
    monkeypatch.setattr(goal_agent, "analyze_goal", boom)

    rooms = [make_room("room-1")]

    scores = agent.recommend_rooms(viewer, rooms)
    assert scores  # 규칙 기반 점수가 대신 채워졌다
    assert agent.analyze_profile(viewer).summary
    assert agent.analyze_goal("해커톤 나가고 싶어요", [], rooms).suggested_room_type == "hackathon"


def test_fallback_disabled_raises(viewer: PersonView, monkeypatch):
    """YEON_ANALYSIS_FALLBACK=false 면 조용히 넘어가지 않고 터진다."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "analysis_fallback", False)
    agent = AgentAnalysis(fallback=MockAnalysisAgent())

    def boom(*args, **kwargs):
        raise AgentUnavailable("no credentials")

    monkeypatch.setattr(profile_agent, "analyze_profile", boom)

    with pytest.raises(AgentUnavailable):
        agent.analyze_profile(viewer)


def test_missing_credentials_becomes_agent_unavailable(monkeypatch):
    """자격증명이 없으면 SDK가 APIError가 아니라 TypeError로 죽는다.

    이걸 잡지 못하면 키를 빠뜨린 배포에서 모든 방 조회가 500으로 터진다.
    """
    from app.agents import base

    class FakeMessages:
        def parse(self, **kwargs):
            raise TypeError("Could not resolve authentication method.")

    class FakeClient:
        messages = FakeMessages()

    monkeypatch.setattr(base, "get_client", lambda: FakeClient())

    with pytest.raises(AgentUnavailable):
        base.run_agent(name="t", system="s", user="u", schema=object)


def test_shortlist_then_select(agent: AgentAnalysis, viewer: PersonView, monkeypatch):
    """후보군에서 걸러진 방은 선별 단계에 넘어가지 않는다."""
    seen: dict = {}

    def fake_shortlist(*, subject, seeker, items, limit=None):
        seen["shortlist_size"] = len(items)
        return ["room-1"]  # room-2는 버린다

    def fake_select(*, subject, seeker, candidates):
        seen["select_ids"] = [c["id"] for c in candidates]
        from app.services.analysis import CandidateScore

        return {"room-1": CandidateScore(score=93, reason="백엔드 역할이 비어 있어요.")}

    monkeypatch.setattr(shortlist_agent, "shortlist", fake_shortlist)
    monkeypatch.setattr(selection_agent, "select", fake_select)

    rooms = [make_room("room-1"), make_room("room-2")]
    scores = agent.recommend_rooms(viewer, rooms)

    assert seen["shortlist_size"] == 2
    assert seen["select_ids"] == ["room-1"]  # 걸러진 방은 넘어가지 않았다
    assert scores["room-1"].score == 93
    # 배치 결과가 단건 조회 캐시에 들어간다 (방마다 LLM을 다시 부르지 않는다)
    assert agent.score_room(viewer, rooms[0]) == 93


class FakeCache:
    """DbScoreCache와 같은 모양의 인메모리 캐시."""

    def __init__(self) -> None:
        self.rows: dict[tuple[str, str, str], tuple[str, dict]] = {}

    def get(self, owner, kind, scope, fingerprint):
        row = self.rows.get((owner, kind, scope))
        if row is None or row[0] != fingerprint:
            return None
        return row[1]

    def put(self, owner, kind, scope, fingerprint, scores):
        self.rows[(owner, kind, scope)] = (fingerprint, scores)


def test_cache_hit_skips_the_agent(viewer: PersonView, monkeypatch):
    """같은 입력이면 에이전트를 다시 부르지 않는다. 목록 화면의 10초가 여기서 사라진다."""
    calls = {"n": 0}

    def counting_select(*, subject, seeker, candidates):
        from app.services.analysis import CandidateScore

        calls["n"] += 1
        return {"room-1": CandidateScore(score=91, reason="맞아요.")}

    monkeypatch.setattr(shortlist_agent, "shortlist", lambda **kwargs: ["room-1"])
    monkeypatch.setattr(selection_agent, "select", counting_select)

    agent = AgentAnalysis(fallback=MockAnalysisAgent(), cache=FakeCache())
    rooms = [make_room("room-1")]

    assert agent.recommend_rooms(viewer, rooms)["room-1"].score == 91
    assert calls["n"] == 1

    # 두 번째 호출은 캐시에서 나온다.
    fresh = AgentAnalysis(fallback=MockAnalysisAgent(), cache=agent._cache)
    assert fresh.recommend_rooms(viewer, rooms)["room-1"].score == 91
    assert calls["n"] == 1  # 에이전트가 다시 불리지 않았다


def test_changed_profile_invalidates_cache(viewer: PersonView, monkeypatch):
    """프로필이 바뀌면 지문이 달라져 다시 계산된다."""
    calls = {"n": 0}

    def counting_select(*, subject, seeker, candidates):
        from app.services.analysis import CandidateScore

        calls["n"] += 1
        return {"room-1": CandidateScore(score=70, reason="이유")}

    monkeypatch.setattr(shortlist_agent, "shortlist", lambda **kwargs: ["room-1"])
    monkeypatch.setattr(selection_agent, "select", counting_select)

    cache = FakeCache()
    rooms = [make_room("room-1")]

    AgentAnalysis(fallback=MockAnalysisAgent(), cache=cache).recommend_rooms(viewer, rooms)
    assert calls["n"] == 1

    changed = PersonView(id=viewer.id, name=viewer.name, skill_tags=["Rust"], interests=["임베디드"])
    AgentAnalysis(fallback=MockAnalysisAgent(), cache=cache).recommend_rooms(changed, rooms)
    assert calls["n"] == 2  # 프로필이 달라져 다시 계산했다


def test_fallback_result_is_not_cached(viewer: PersonView, monkeypatch):
    """규칙 기반으로 떨어진 결과를 캐시하면, 키가 돌아와도 계속 그 값을 쓰게 된다."""

    def boom(*args, **kwargs):
        raise AgentUnavailable("no credentials")

    monkeypatch.setattr(shortlist_agent, "shortlist", boom)

    cache = FakeCache()
    agent = AgentAnalysis(fallback=MockAnalysisAgent(), cache=cache)
    agent.recommend_rooms(viewer, [make_room("room-1")])

    assert cache.rows == {}


def test_selection_drops_hallucinated_ids_and_clamps_score(monkeypatch):
    """모델이 없는 id를 지어내거나 점수 범위를 벗어나도 응답이 깨지지 않는다."""
    from app.agents import base

    class FakeItem:
        def __init__(self, id, score, reason):
            self.id = id
            self.score = score
            self.reason = reason

    class FakeOut:
        items = [
            FakeItem("room-1", 150, "  넘치는 점수  "),
            FakeItem("room-없음", 90, "지어낸 방"),
        ]

    monkeypatch.setattr(base, "run_agent", lambda **kwargs: FakeOut())
    monkeypatch.setattr(selection_agent, "run_agent", lambda **kwargs: FakeOut())

    result = selection_agent.select(
        subject="테스트", seeker={"id": "user-me"}, candidates=[{"id": "room-1"}]
    )

    assert set(result) == {"room-1"}  # 지어낸 id는 버려졌다
    assert result["room-1"].score == 100  # 150 → 100으로 눌림
    assert result["room-1"].reason == "넘치는 점수"


def test_shortlist_skips_llm_when_list_is_small(monkeypatch):
    """목록이 상한보다 작으면 걸러낼 것이 없으므로 LLM을 부르지 않는다."""
    called = False

    def spy(**kwargs):
        nonlocal called
        called = True
        raise AssertionError("불려서는 안 된다")

    monkeypatch.setattr(shortlist_agent, "run_agent", spy)

    items = [{"id": f"room-{i}"} for i in range(3)]
    result = shortlist_agent.shortlist(subject="테스트", seeker={}, items=items)

    assert result == ["room-0", "room-1", "room-2"]
    assert called is False


def test_goal_agent_drops_unknown_room_ids(monkeypatch):
    """목표 해석이 존재하지 않는 방을 추천하면 걸러낸다."""

    class FakeOut:
        normalized_goal = "AI 해커톤 팀 구성"
        keywords = ["AI", "해커톤"]
        suggested_room_type = "hackathon"
        suggested_roles = ["백엔드 개발"]
        recommended_room_ids = ["room-1", "room-지어냄"]

    monkeypatch.setattr(goal_agent, "run_agent", lambda **kwargs: FakeOut())

    result = goal_agent.analyze_goal("AI 해커톤", ["AI"], [make_room("room-1")])

    assert result.recommended_room_ids == ["room-1"]
    assert result.suggested_room_type == "hackathon"
