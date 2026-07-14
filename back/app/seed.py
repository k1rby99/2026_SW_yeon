"""데모 데이터. MSW 픽스처(front/src/mocks/handlers.ts)와 같은 인물·방을 넣어
목업에서 실제 백엔드로 전환해도 화면이 그대로 보이게 한다.

데모 계정 비밀번호는 모두 `yeon1234`이며, 로그인 시작점은 demo@yeon.dev 이다.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Application, Message, Opportunity, Profile, Room, RoomMember, User

DEMO_PASSWORD = "yeon1234"

USERS = [
    {
        "id": "user-me", "email": "demo@yeon.dev", "name": "나",
        "role": "프론트엔드 개발자", "bio": "사용하기 편한 모바일 경험을 만들고 있습니다.",
        "skill_tags": ["React", "TypeScript", "UI 구현"],
        "interests": ["모바일", "로컬", "사이드 프로젝트"],
        "collab_style": "아이디어를 빠르게 화면으로 만들고 피드백을 주고받는 협업을 선호해요.",
        "project_history": ["동네 모임 지도 서비스 프론트엔드", "공공데이터 해커톤 프로토타입"],
        "social_links": {"github": "https://github.com/"},
    },
    {
        "id": "user-1", "email": "seoyun@yeon.dev", "name": "김서윤",
        "role": "AI 엔지니어", "bio": "모델을 제품으로 만드는 과정을 좋아합니다.",
        "skill_tags": ["Python", "PyTorch", "LLM"], "interests": ["AI", "해커톤"],
        "collab_style": "짧은 주기로 실험하고 결과를 공유하는 방식을 선호해요.",
        "project_history": ["추천 모델 서빙", "AI 해커톤 우승"],
        "social_links": {},
    },
    {
        "id": "user-2", "email": "jihu@yeon.dev", "name": "박지후",
        "role": "프로덕트 매니저", "bio": "문제를 구조화하고 팀이 같은 목표를 보도록 돕습니다.",
        "skill_tags": ["서비스 기획", "사용자 인터뷰", "데이터 분석"],
        "interests": ["로컬", "커뮤니티", "커피챗"],
        "collab_style": "목표와 일정을 명확히 합의하고 자율적으로 실행하는 방식을 선호해요.",
        "project_history": ["지역 상권 탐색 서비스 PM", "청년 정책 데이터 프로젝트"],
        "social_links": {"blog": "https://example.com/jihu"},
    },
    {
        "id": "user-3", "email": "harin@yeon.dev", "name": "이하린",
        "role": "UX 디자이너", "bio": "관찰과 인터뷰를 바탕으로 사람 중심의 제품을 설계합니다.",
        "skill_tags": ["Figma", "UX 리서치", "프로토타이핑"],
        "interests": ["디자인", "커뮤니티", "커리어"],
        "collab_style": "작은 가설을 함께 검증하고 결과를 투명하게 공유하는 팀을 좋아해요.",
        "project_history": ["모빌리티 앱 UX 개선", "지역 커뮤니티 리서치"],
        "social_links": {"instagram": "https://instagram.com/"},
    },
    {
        "id": "user-4", "email": "doyun@yeon.dev", "name": "정도윤",
        "role": "백엔드 개발자", "bio": "안정적인 API와 운영 가능한 구조를 만드는 개발자입니다.",
        "skill_tags": ["FastAPI", "PostgreSQL", "Docker"],
        "interests": ["AI", "데이터", "오픈소스"],
        "collab_style": "기술 결정을 기록하고 작은 단위로 자주 배포하는 방식을 선호해요.",
        "project_history": ["추천 시스템 API 개발", "데이터 파이프라인 운영"],
        "social_links": {"github": "https://github.com/"},
    },
    {
        "id": "user-5", "email": "yuna@yeon.dev", "name": "최윤아",
        "role": "백엔드 개발자", "bio": "서비스 구조를 단단하게 만들고 빠르게 실험하는 개발자입니다.",
        "skill_tags": ["FastAPI", "PostgreSQL", "AWS"], "interests": ["AI", "사이드 프로젝트"],
        "collab_style": "설계를 먼저 맞추고 구현은 빠르게 가는 방식을 좋아해요.",
        "project_history": ["결제 API 설계", "사이드 프로젝트 2건 운영"],
        "social_links": {},
    },
    {
        "id": "user-6", "email": "dohyun@yeon.dev", "name": "윤도현",
        "role": "프로덕트 디자이너", "bio": "사용자 문제를 화면과 프로토타입으로 구체화합니다.",
        "skill_tags": ["Figma", "UX 리서치", "프로토타이핑"], "interests": ["로컬", "커뮤니티"],
        "collab_style": "빠른 스케치와 잦은 리뷰를 선호해요.",
        "project_history": ["커뮤니티 앱 리디자인"],
        "social_links": {},
    },
]

ROOMS = [
    {
        "id": "room-ai-hackathon", "title": "AI 해커톤, 주말에 몰입할 팀", "type": "hackathon",
        "summary": "아이디어부터 프로토타입까지 함께 완성할 개발자와 디자이너를 찾습니다.",
        "image_url": "/contests/ai-innovation.png", "tags": ["AI", "해커톤", "프로토타입"],
        "required_roles": ["백엔드", "프로덕트 디자인"], "status": "recruiting", "capacity": 5,
        "deadline": "2026-08-12", "owner_id": "user-1", "meeting_style": "hybrid",
        "members": ["user-1", "user-4", "user-6"], "age_days": 4,
    },
    {
        "id": "room-public-data", "title": "공공데이터로 지역 문제 해결하기", "type": "competition",
        "summary": "데이터 분석과 서비스 기획을 결합해 공모전 출품작을 만들어요.",
        "image_url": "/contests/public-data.png", "tags": ["공공데이터", "기획", "데이터"],
        "required_roles": ["프론트엔드", "데이터 분석"], "status": "recruiting", "capacity": 4,
        "deadline": "2026-08-21", "owner_id": "user-2", "meeting_style": "online",
        "members": ["user-2", "user-3"], "age_days": 5,
    },
    {
        "id": "room-coffee-chat", "title": "주니어 PM 커피챗 모임", "type": "coffee_chat",
        "summary": "격주로 만나 제품 고민과 커리어 경험을 편하게 나눕니다.",
        "image_url": None, "tags": ["커피챗", "PM", "커리어"], "required_roles": [],
        "status": "active", "capacity": 6, "deadline": None, "owner_id": "user-3",
        "meeting_style": "offline",
        "members": ["user-3", "user-2", "user-4", "user-me"], "age_days": 24,
    },
    {
        "id": "room-my-project", "title": "사이드 프로젝트: 동네 취향 지도", "type": "project",
        "summary": "로컬 공간을 취향으로 발견하는 모바일 서비스를 만들고 있습니다.",
        "image_url": "/contests/startup-design.png",
        "tags": ["사이드프로젝트", "모바일", "로컬"], "required_roles": ["React 개발자"],
        "status": "active", "capacity": 5, "deadline": None, "owner_id": "user-me",
        "meeting_style": "hybrid",
        "members": ["user-me", "user-2", "user-3", "user-4"], "age_days": 42,
    },
    {
        "id": "room-ended-study", "title": "데이터 시각화 6주 스터디", "type": "study",
        "summary": "매주 결과물을 공유하며 완주한 데이터 시각화 스터디입니다.",
        "image_url": None, "tags": ["스터디", "데이터"], "required_roles": [],
        "status": "ended", "capacity": 6, "deadline": None, "owner_id": "user-4",
        "meeting_style": "online",
        "members": ["user-4", "user-me", "user-2", "user-3"], "age_days": 104,
    },
]

OPPORTUNITIES = [
    {
        "id": "op-ai-innovation", "type": "contest", "status": "open", "category": "AI · 소프트웨어",
        "title": "2026 AI 서비스 아이디어 경진대회", "organizer": "한국소프트웨어진흥원",
        "summary": "생성형 AI를 활용해 일상의 문제를 해결하는 서비스 아이디어와 프로토타입을 모집합니다.",
        "image_url": "/contests/ai-innovation.png", "tags": ["AI", "서비스 기획", "프로토타입"],
        "deadline": "2026-07-26", "period": "2026.07.01 - 2026.07.26",
        "eligibility": "대학생 및 만 34세 이하 청년, 2~5인 팀",
        "benefits": ["대상 500만원", "전문가 멘토링", "후속 창업 프로그램 연계"],
        "official_url": "https://example.com/ai-contest", "featured": True,
    },
    {
        "id": "op-public-data", "type": "contest", "status": "open", "category": "공공데이터",
        "title": "공공데이터 활용 창업 경진대회", "organizer": "행정안전부",
        "summary": "공공데이터를 활용한 사회문제 해결 아이디어와 제품·서비스를 발굴합니다.",
        "image_url": "/contests/public-data.png", "tags": ["공공데이터", "창업", "데이터 분석"],
        "deadline": "2026-08-04", "period": "2026.06.20 - 2026.08.04",
        "eligibility": "공공데이터 기반 아이디어를 가진 개인 또는 팀",
        "benefits": ["총상금 2,000만원", "사업화 컨설팅", "데이터 기업 네트워킹"],
        "official_url": "https://example.com/public-data", "featured": True,
    },
    {
        "id": "op-design-challenge", "type": "contest", "status": "open", "category": "스타트업 · 디자인",
        "title": "청년 프로덕트 디자인 챌린지", "organizer": "서울디자인재단",
        "summary": "초기 스타트업의 실제 문제를 해결할 프로덕트 디자이너와 개발자 팀을 모집합니다.",
        "image_url": "/contests/startup-design.png", "tags": ["UX", "프로덕트 디자인", "스타트업"],
        "deadline": "2026-08-13", "period": "2026.07.10 - 2026.08.13",
        "eligibility": "디자인 또는 개발 포트폴리오를 보유한 청년",
        "benefits": ["우수팀 상금 300만원", "현직자 리뷰", "협력사 인턴십 기회"],
        "official_url": "https://example.com/design", "featured": True,
    },
    {
        "id": "op-startup-campus", "type": "announcement", "status": "open", "category": "창업 지원",
        "title": "2026 예비창업패키지 참여팀 모집", "organizer": "창업진흥원",
        "summary": "기술 기반 아이디어를 보유한 예비창업팀에 사업화 자금과 교육을 지원합니다.",
        "image_url": "/contests/ai-innovation.png", "tags": ["예비창업", "사업화", "멘토링"],
        "deadline": "2026-08-20", "period": "2026.07.15 - 2026.08.20",
        "eligibility": "사업자 등록 전인 예비창업자 또는 팀",
        "benefits": ["사업화 자금 지원", "전담 멘토 배정", "투자 연계 데모데이"],
        "official_url": "https://example.com/startup", "featured": False,
    },
    {
        "id": "op-coffee-chat", "type": "announcement", "status": "upcoming", "category": "네트워킹",
        "title": "IT 직무 커피챗 네트워킹 데이", "organizer": "청년취업사관학교",
        "summary": "개발, 디자인, 기획 현직자와 소규모로 대화하고 동료를 만나는 네트워킹 프로그램입니다.",
        "image_url": "/contests/startup-design.png", "tags": ["커피챗", "커리어", "네트워킹"],
        "deadline": "2026-09-01", "period": "2026.08.18 - 2026.09.01",
        "eligibility": "IT 직무 취업과 협업에 관심 있는 누구나",
        "benefits": ["현직자 그룹 커피챗", "참여자 네트워킹", "직무별 포트폴리오 상담"],
        "official_url": "https://example.com/coffee-chat", "featured": False,
    },
    {
        "id": "op-open-source", "type": "announcement", "status": "open", "category": "개발자 프로그램",
        "title": "오픈소스 컨트리뷰션 아카데미 참가자 모집", "organizer": "정보통신산업진흥원",
        "summary": "멘토와 함께 실제 오픈소스 프로젝트에 기여하며 협업 경험을 쌓는 프로그램입니다.",
        "image_url": "/contests/public-data.png", "tags": ["오픈소스", "개발", "협업"],
        "deadline": "2026-08-28", "period": "2026.07.28 - 2026.08.28",
        "eligibility": "오픈소스 기여에 관심 있는 개발자",
        "benefits": ["프로젝트 멘토링", "수료 인증", "우수 참여자 해외 행사 지원"],
        "official_url": "https://example.com/open-source", "featured": False,
    },
]

# 방장(데모 계정)이 신청 관리 화면에서 승인/거절을 눌러볼 수 있도록 대기 중인 신청을 넣는다.
APPLICATIONS = [
    ("room-my-project", "user-5", "FastAPI로 두 번의 사이드 프로젝트를 운영했습니다. API 설계와 배포를 맡고 싶어요.", 26),
    ("room-my-project", "user-6", "로컬 서비스 UX 리서치 경험을 살려 함께하고 싶습니다.", 50),
]

MESSAGES = [
    ("room-my-project", "user-2", "이번 주에는 지도 탐색 화면 와이어프레임을 먼저 맞춰보면 좋겠어요.", 6),
    ("room-my-project", "user-me", "좋아요. API 응답 구조도 같이 정리해서 공유할게요.", 5),
    ("room-my-project", "user-3", "저는 사용자 인터뷰 질문 초안을 오늘 저녁까지 올리겠습니다.", 4),
    ("room-coffee-chat", "user-3", "다음 커피챗은 목요일 저녁 8시 어떠세요?", 30),
]


def seed_demo_data(db: Session) -> None:
    """이미 데이터가 있으면 아무 것도 하지 않는다(재시작 시 중복 방지)."""
    if db.scalar(select(User).limit(1)) is not None:
        return

    now = datetime.now(timezone.utc)
    password_hash = hash_password(DEMO_PASSWORD)

    for spec in USERS:
        db.add(User(id=spec["id"], email=spec["email"], name=spec["name"], password_hash=password_hash))
        db.add(
            Profile(
                user_id=spec["id"],
                role=spec["role"],
                bio=spec["bio"],
                skill_tags=spec["skill_tags"],
                interests=spec["interests"],
                collab_style=spec["collab_style"],
                project_history=spec["project_history"],
                social_links=spec["social_links"],
                visibility_scope="public",
                onboarding_completed=True,
                strengths=[],
            )
        )
    db.flush()

    for spec in ROOMS:
        db.add(
            Room(
                id=spec["id"], title=spec["title"], type=spec["type"], summary=spec["summary"],
                image_url=spec["image_url"], tags=spec["tags"], required_roles=spec["required_roles"],
                status=spec["status"], capacity=spec["capacity"], deadline=spec["deadline"],
                owner_id=spec["owner_id"], visibility="public", application_mode="approval",
                meeting_style=spec["meeting_style"],
                created_at=now - timedelta(days=spec["age_days"]),
            )
        )
        for user_id in spec["members"]:
            db.add(
                RoomMember(
                    room_id=spec["id"],
                    user_id=user_id,
                    is_owner=user_id == spec["owner_id"],
                    joined_at=now - timedelta(days=spec["age_days"]),
                )
            )
    db.flush()

    for spec in OPPORTUNITIES:
        db.add(Opportunity(**spec))

    for room_id, applicant_id, message, hours_ago in APPLICATIONS:
        db.add(
            Application(
                room_id=room_id,
                applicant_id=applicant_id,
                message=message,
                status="pending",
                created_at=now - timedelta(hours=hours_ago),
            )
        )

    for room_id, sender_id, content, hours_ago in MESSAGES:
        db.add(
            Message(
                room_id=room_id,
                sender_id=sender_id,
                content=content,
                created_at=now - timedelta(hours=hours_ago),
            )
        )

    db.commit()
