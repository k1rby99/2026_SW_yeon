"""공모전과 1:1 매칭 계열(추천 → 수락 → 매칭 → 피드백) 흐름 테스트."""

from fastapi.testclient import TestClient

from tests.test_api import auth, client, register  # noqa: F401  (client 픽스처 재사용)


def test_opportunities(client: TestClient) -> None:
    token = register(client, "op@yeon.dev", "공모")

    # 시드가 꺼진 테스트 DB라 비어 있는 것이 정상이다. 형태만 확인한다.
    res = client.get("/api/opportunities", headers=auth(token))
    assert res.status_code == 200
    assert res.json() == {"items": []}

    assert client.get("/api/opportunities/없는id", headers=auth(token)).status_code == 404
    assert client.get("/api/opportunities").status_code == 401


def test_recommendation_to_feedback_flow(client: TestClient) -> None:
    me = register(client, "me@yeon.dev", "나")
    other = register(client, "other@yeon.dev", "상대")

    client.post(
        "/api/profile",
        headers=auth(me),
        json={"interests": ["AI"], "skillTags": ["React"], "role": "프론트엔드"},
    )
    client.post(
        "/api/profile",
        headers=auth(other),
        json={"interests": ["AI"], "skillTags": ["FastAPI"], "role": "백엔드"},
    )

    # 추천 목록에 상대가 뜬다. 내가 갖지 못한 역량이 gapTags로 잡힌다.
    body = client.get("/api/recommendations?page=1&size=6", headers=auth(me)).json()
    assert body["page"] == 1 and body["hasMore"] is False
    recommendation = next(item for item in body["items"] if item["candidateId"] != "")
    assert "FastAPI" in recommendation["gapTags"]
    assert recommendation["reasonText"]

    rec_id = recommendation["id"]
    assert client.get(f"/api/recommendations/{rec_id}", headers=auth(me)).status_code == 200

    # 수락하면 매칭이 생긴다.
    res = client.post(
        f"/api/recommendations/{rec_id}/action", headers=auth(me), json={"action": "accept"}
    )
    assert res.status_code == 200
    assert res.json()["action"] == "accept"

    # 같은 추천을 두 번 처리할 수 없다.
    res = client.post(
        f"/api/recommendations/{rec_id}/action", headers=auth(me), json={"action": "reject"}
    )
    assert res.status_code == 409
    assert res.json()["code"] == "ALREADY_ACTIONED"

    # 처리한 상대는 추천 목록에서 빠진다.
    remaining = client.get("/api/recommendations", headers=auth(me)).json()["items"]
    assert rec_id not in [item["id"] for item in remaining]

    matches = client.get("/api/matches?status=active", headers=auth(me)).json()
    assert len(matches) == 1
    match_id = matches[0]["id"]

    # 상대편에서도 같은 매칭이 보인다.
    assert [m["id"] for m in client.get("/api/matches", headers=auth(other)).json()] == [match_id]

    res = client.post(
        "/api/feedback",
        headers=auth(me),
        json={"matchId": match_id, "satisfactionScore": 5, "comment": "좋았어요"},
    )
    assert res.status_code == 201
    assert res.json()["satisfactionScore"] == 5

    # 종료하면 active 목록에서 사라진다.
    res = client.patch(f"/api/matches/{match_id}", headers=auth(me))
    assert res.status_code == 200
    assert res.json()["status"] == "ended"
    assert res.json()["endedAt"] is not None

    assert client.get("/api/matches?status=active", headers=auth(me)).json() == []
    assert client.patch(f"/api/matches/{match_id}", headers=auth(me)).status_code == 409


def test_cannot_act_on_unknown_recommendation(client: TestClient) -> None:
    token = register(client, "solo@yeon.dev", "혼자")

    assert client.get("/api/recommendations/rec-없는사람", headers=auth(token)).status_code == 404
    # 접두사가 없는 id도 404
    assert client.get("/api/recommendations/garbage", headers=auth(token)).status_code == 404


def test_feedback_requires_membership_in_match(client: TestClient) -> None:
    me = register(client, "a@yeon.dev", "에이")
    register(client, "c@yeon.dev", "씨")

    # 이 시점의 추천 대상은 '씨' 한 명뿐이므로 매칭 상대가 결정적이다.
    rec_id = client.get("/api/recommendations", headers=auth(me)).json()["items"][0]["id"]
    client.post(f"/api/recommendations/{rec_id}/action", headers=auth(me), json={"action": "accept"})
    match_id = client.get("/api/matches", headers=auth(me)).json()[0]["id"]

    # 매칭이 맺어진 뒤에 들어온 제3자는 당사자가 아니다.
    stranger = register(client, "b@yeon.dev", "비")

    res = client.post(
        "/api/feedback",
        headers=auth(stranger),
        json={"matchId": match_id, "satisfactionScore": 3},
    )
    assert res.status_code == 404
