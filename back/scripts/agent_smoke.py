"""4개 에이전트를 실제 Claude API로 한 번씩 태워 보는 스모크 스크립트.

테스트(tests/test_agents.py)는 네트워크를 타지 않는다. 이 스크립트가 실제 호출을 검증한다.

실행:
    cd back
    export ANTHROPIC_API_KEY=sk-ant-...
    .venv/bin/python -m scripts.agent_smoke

폴백을 꺼서 실패가 조용히 넘어가지 않게 한다. 오류가 나면 그대로 터진다.
"""

from app.core.config import settings

settings.analysis_engine = "agent"
settings.analysis_fallback = False  # 실패를 숨기지 않는다

from app.agents.pipeline import AgentAnalysis  # noqa: E402
from app.models import Room  # noqa: E402
from app.services.analysis import MockAnalysisAgent, PersonView  # noqa: E402

ME = PersonView(
    id="user-me",
    name="차원제",
    role="프론트엔드 개발자",
    bio="사용하기 편한 모바일 경험을 만듭니다. 접근성에 관심이 많아요.",
    collab_style="아이디어를 빠르게 화면으로 만들고 피드백을 주고받는 협업을 선호해요.",
    skill_tags=["React", "TypeScript", "UI 구현"],
    interests=["모바일", "로컬", "사이드 프로젝트"],
)

ROOMS = [
    Room(
        id="room-ai-hackathon",
        title="AI 해커톤, 주말에 몰입할 팀",
        type="hackathon",
        summary="아이디어부터 프로토타입까지 함께 완성할 개발자와 디자이너를 찾습니다.",
        tags=["AI", "해커톤", "프로토타입"],
        required_roles=["백엔드", "프로덕트 디자인"],
        status="recruiting",
        capacity=5,
        owner_id="user-1",
        meeting_style="hybrid",
        deadline="2026-08-12",
    ),
    Room(
        id="room-public-data",
        title="공공데이터로 지역 문제 해결하기",
        type="competition",
        summary="데이터 분석과 서비스 기획을 결합해 공모전 출품작을 만들어요.",
        tags=["공공데이터", "기획", "데이터"],
        required_roles=["프론트엔드", "데이터 분석"],
        status="recruiting",
        capacity=4,
        owner_id="user-2",
        meeting_style="online",
        deadline="2026-08-21",
    ),
    Room(
        id="room-knitting",
        title="주말 뜨개질 모임",
        type="networking",
        summary="조용히 손을 움직이며 이야기 나누는 모임입니다.",
        tags=["뜨개질", "취미"],
        required_roles=[],
        status="recruiting",
        capacity=8,
        owner_id="user-3",
        meeting_style="offline",
    ),
]

CANDIDATES = [
    PersonView(
        id="user-5",
        name="최윤아",
        role="백엔드 개발자",
        bio="서비스 구조를 단단하게 만들고 빠르게 실험하는 개발자입니다.",
        skill_tags=["FastAPI", "PostgreSQL", "AWS"],
        interests=["AI", "사이드 프로젝트"],
    ),
    PersonView(
        id="user-6",
        name="윤도현",
        role="프로덕트 디자이너",
        bio="사용자 문제를 화면과 프로토타입으로 구체화합니다.",
        skill_tags=["Figma", "UX 리서치"],
        interests=["로컬", "커뮤니티"],
    ),
]


def main() -> None:
    agent = AgentAnalysis(fallback=MockAnalysisAgent())

    print("=" * 70)
    print("1. 프로필 분석")
    insight = agent.analyze_profile(ME)
    print(f"  요약   : {insight.summary}")
    print(f"  협업   : {insight.collaboration_style}")
    print(f"  태그   : {', '.join(insight.derived_tags)}")
    for strength in insight.strengths:
        print(f"  강점   : {strength.label} (level {strength.level})")

    print("=" * 70)
    print("2. 인연 목표 해석")
    goal = agent.analyze_goal("AI 해커톤에 나갈 백엔드 개발자와 디자이너를 찾고 싶어요", [], ROOMS)
    print(f"  정규화 : {goal.normalized_goal}")
    print(f"  방 유형: {goal.suggested_room_type}")
    print(f"  역할   : {', '.join(goal.suggested_roles)}")
    print(f"  추천 방: {', '.join(goal.recommended_room_ids) or '(없음)'}")

    print("=" * 70)
    print("3+4. 후보군 형성 → 대상 선별 (인연 방 추천)")
    for room_id, scored in sorted(
        agent.recommend_rooms(ME, ROOMS).items(), key=lambda item: item[1].score, reverse=True
    ):
        print(f"  {scored.score:3d}  {room_id:20s} {scored.reason}")
    print("  ※ '뜨개질 모임'이 빠지거나 낮은 점수를 받아야 정상입니다.")

    print("=" * 70)
    print("3+4. 후보군 형성 → 대상 선별 (초대 후보 추천)")
    for user_id, scored in sorted(
        agent.recommend_candidates(ROOMS[0], CANDIDATES).items(),
        key=lambda item: item[1].score,
        reverse=True,
    ):
        print(f"  {scored.score:3d}  {user_id:10s} {scored.reason}")


if __name__ == "__main__":
    main()
