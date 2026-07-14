"""핵심 흐름 스모크 테스트: 가입 → 온보딩 → 방 생성 → 신청 → 승인 → 채팅."""

import os
import tempfile
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["YEON_SEED_DEMO_DATA"] = "false"

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client() -> Iterator[TestClient]:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    os.unlink(path)


def register(client: TestClient, email: str, name: str) -> str:
    res = client.post(
        "/api/auth/signup", json={"email": email, "password": "yeon1234", "name": name}
    )
    assert res.status_code == 201, res.text
    return res.json()["accessToken"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json()["status"] == "ok"


def test_requires_auth(client: TestClient) -> None:
    res = client.get("/api/rooms/recommended")
    assert res.status_code == 401
    assert res.json()["code"] == "UNAUTHORIZED"


def test_profile_404_before_onboarding(client: TestClient) -> None:
    token = register(client, "a@yeon.dev", "에이")
    assert client.get("/api/profile", headers=auth(token)).status_code == 404


def test_full_room_flow(client: TestClient) -> None:
    owner = register(client, "owner@yeon.dev", "방장")
    applicant = register(client, "applicant@yeon.dev", "신청자")

    # 온보딩
    res = client.post(
        "/api/profile",
        headers=auth(owner),
        json={"interests": ["AI"], "skillTags": ["FastAPI"], "collabStyle": "빠르게", "role": "백엔드"},
    )
    assert res.status_code == 201
    assert res.json()["onboardingCompleted"] is True

    client.post(
        "/api/profile",
        headers=auth(applicant),
        json={"interests": ["AI"], "skillTags": ["React"], "role": "프론트엔드"},
    )

    # 방 생성 — 만든 사람은 방장이자 첫 멤버
    res = client.post(
        "/api/rooms",
        headers=auth(owner),
        json={
            "title": "AI 해커톤 팀", "type": "hackathon", "summary": "주말 몰입",
            "tags": ["AI"], "requiredRoles": ["프론트엔드"], "capacity": 2,
            "visibility": "public", "applicationMode": "approval", "meetingStyle": "online",
        },
    )
    assert res.status_code == 201, res.text
    room = res.json()
    room_id = room["id"]
    assert room["membershipRole"] == "owner"
    assert room["memberCount"] == 1

    # 신청자에게는 추천 목록에 뜬다
    recommended = client.get("/api/rooms/recommended", headers=auth(applicant)).json()
    assert room_id in [item["id"] for item in recommended["items"]]

    # 참여 신청
    res = client.post(
        f"/api/rooms/{room_id}/applications",
        headers=auth(applicant),
        json={"message": "함께하고 싶어요"},
    )
    assert res.status_code == 201, res.text
    application_id = res.json()["id"]

    # 중복 신청 차단
    res = client.post(
        f"/api/rooms/{room_id}/applications", headers=auth(applicant), json={"message": "또"}
    )
    assert res.status_code == 409
    assert res.json()["code"] == "DUPLICATE_APPLICATION"

    # 방장이 아니면 신청 목록을 못 본다
    assert client.get(f"/api/rooms/{room_id}/applications", headers=auth(applicant)).status_code == 403

    # 승인
    res = client.patch(
        f"/api/rooms/{room_id}/applications/{application_id}",
        headers=auth(owner),
        json={"action": "approve"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "approved"

    # 재처리 차단
    res = client.patch(
        f"/api/rooms/{room_id}/applications/{application_id}",
        headers=auth(owner),
        json={"action": "approve"},
    )
    assert res.json()["code"] == "APPLICATION_ALREADY_DECIDED"

    # 신청자 시점에서 멤버가 되었다
    room = client.get(f"/api/rooms/{room_id}", headers=auth(applicant)).json()
    assert room["membershipRole"] == "member"
    assert room["applicationStatus"] == "approved"
    assert room["memberCount"] == 2

    # 정원을 현재 인원 아래로 줄일 수 없다
    res = client.patch(f"/api/rooms/{room_id}", headers=auth(owner), json={"capacity": 1})
    assert res.status_code == 409
    assert res.json()["code"] == "CAPACITY_UNDER_MEMBER_COUNT"

    # 채팅
    res = client.post(
        f"/api/rooms/{room_id}/messages", headers=auth(applicant), json={"content": "안녕하세요!"}
    )
    assert res.status_code == 201
    messages = client.get(f"/api/rooms/{room_id}/messages", headers=auth(owner)).json()
    assert [m["content"] for m in messages["items"]] == ["안녕하세요!"]

    # 멤버 목록
    members = client.get(f"/api/rooms/{room_id}/members", headers=auth(owner)).json()
    assert len(members) == 2
    assert members[0]["isOwner"] is True


def test_room_full_blocks_application(client: TestClient) -> None:
    owner = register(client, "o2@yeon.dev", "방장2")
    applicant = register(client, "a2@yeon.dev", "신청자2")

    res = client.post(
        "/api/rooms",
        headers=auth(owner),
        json={"title": "1인 방", "type": "study", "capacity": 1},
    )
    room_id = res.json()["id"]

    res = client.post(f"/api/rooms/{room_id}/applications", headers=auth(applicant), json={})
    assert res.status_code == 409
    assert res.json()["code"] == "ROOM_FULL"


def test_instant_mode_joins_immediately(client: TestClient) -> None:
    owner = register(client, "o3@yeon.dev", "방장3")
    applicant = register(client, "a3@yeon.dev", "신청자3")

    res = client.post(
        "/api/rooms",
        headers=auth(owner),
        json={"title": "바로 참여", "type": "networking", "capacity": 4, "applicationMode": "instant"},
    )
    room_id = res.json()["id"]

    res = client.post(f"/api/rooms/{room_id}/applications", headers=auth(applicant), json={})
    assert res.status_code == 201
    assert res.json()["status"] == "approved"

    room = client.get(f"/api/rooms/{room_id}", headers=auth(applicant)).json()
    assert room["membershipRole"] == "member"


def test_invitation_inbox_flow(client: TestClient) -> None:
    """초대는 보내는 것만으로 끝나지 않는다. 받은 사람이 수락해야 멤버가 된다."""
    owner = register(client, "inv-owner@yeon.dev", "방장")
    invitee = register(client, "inv-guest@yeon.dev", "초대받은이")

    client.post("/api/profile", headers=auth(invitee), json={"skillTags": ["FastAPI"]})

    room_id = client.post(
        "/api/rooms",
        headers=auth(owner),
        json={"title": "초대 테스트", "type": "study", "capacity": 3},
    ).json()["id"]

    candidates = client.get(f"/api/rooms/{room_id}/candidates", headers=auth(owner)).json()
    guest_id = next(c["id"] for c in candidates)

    res = client.post(
        f"/api/rooms/{room_id}/invitations",
        headers=auth(owner),
        json={"userId": guest_id, "message": "함께해요"},
    )
    assert res.status_code == 201

    # 초대받은 사람의 초대함에 뜬다.
    inbox = client.get("/api/invitations", headers=auth(invitee)).json()
    assert len(inbox) == 1
    assert inbox[0]["room"]["title"] == "초대 테스트"
    assert inbox[0]["inviter"]["name"] == "방장"
    invitation_id = inbox[0]["id"]

    # 남의 초대는 건드릴 수 없다.
    assert (
        client.patch(
            f"/api/invitations/{invitation_id}", headers=auth(owner), json={"action": "accept"}
        ).status_code
        == 404
    )

    # 수락하면 곧바로 멤버가 된다.
    res = client.patch(
        f"/api/invitations/{invitation_id}", headers=auth(invitee), json={"action": "accept"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "accepted"
    assert res.json()["room"]["membershipRole"] == "member"

    # 답한 초대는 초대함에서 사라진다.
    assert client.get("/api/invitations", headers=auth(invitee)).json() == []

    # 두 번 처리할 수 없다.
    res = client.patch(
        f"/api/invitations/{invitation_id}", headers=auth(invitee), json={"action": "decline"}
    )
    assert res.status_code == 409
    assert res.json()["code"] == "INVITATION_ALREADY_DECIDED"


def test_declined_invitation_does_not_join(client: TestClient) -> None:
    owner = register(client, "d-owner@yeon.dev", "방장")
    invitee = register(client, "d-guest@yeon.dev", "거절할이")

    room_id = client.post(
        "/api/rooms", headers=auth(owner), json={"title": "거절 테스트", "type": "study", "capacity": 3}
    ).json()["id"]
    guest_id = client.get(f"/api/rooms/{room_id}/candidates", headers=auth(owner)).json()[0]["id"]
    client.post(
        f"/api/rooms/{room_id}/invitations", headers=auth(owner), json={"userId": guest_id}
    )

    invitation_id = client.get("/api/invitations", headers=auth(invitee)).json()[0]["id"]
    res = client.patch(
        f"/api/invitations/{invitation_id}", headers=auth(invitee), json={"action": "decline"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "declined"

    # 거절했으므로 멤버가 아니다.
    room = client.get(f"/api/rooms/{room_id}", headers=auth(invitee)).json()
    assert room["membershipRole"] is None
    assert room["memberCount"] == 1


def test_goal_analyze(client: TestClient) -> None:
    token = register(client, "g@yeon.dev", "목표")

    res = client.post("/api/goals/analyze", headers=auth(token), json={"text": "", "keywords": []})
    assert res.status_code == 400
    assert res.json()["code"] == "EMPTY_GOAL"

    res = client.post(
        "/api/goals/analyze",
        headers=auth(token),
        json={"text": "AI 해커톤에 나갈 백엔드 개발자와 디자이너를 찾고 싶어요", "keywords": ["해커톤"]},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["suggestedRoomType"] == "hackathon"
    assert "백엔드 개발" in body["suggestedRoles"]
    assert "프로덕트 디자인" in body["suggestedRoles"]
