"""2. 인연 목표 해석 에이전트.

"AI 해커톤 나갈 백엔드랑 디자이너 구해요" 같은 문장을 방 유형·필요 역할·키워드로 정규화하고,
지금 모집 중인 방 중 목표에 맞는 것을 골라 준다.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.agents.base import as_json, run_agent
from app.models import Room
from app.services.analysis import GoalAnalysisResult

SYSTEM = """당신은 협업 팀 매칭 서비스 '연(緣)'의 목표 해석가입니다.

사용자가 자유롭게 쓴 목표 문장을 읽고, 어떤 종류의 '인연 방'을 찾아야 하는지 정리하세요.

방 유형(suggested_room_type)은 반드시 아래 중 하나입니다.
- competition  공모전·경진대회
- hackathon    해커톤처럼 짧게 몰입하는 대회
- study        스터디
- project      사이드 프로젝트·창업
- coffee_chat  커피챗·멘토링 같은 1:1 대화
- networking   느슨한 모임·네트워킹

규칙:
- normalized_goal은 사용자의 목표를 한 문장으로 다듬은 것입니다. 한국어로 씁니다.
- suggested_roles는 이 목표를 이루기 위해 팀에 필요한 역할입니다. 사용자 본인의 역할이 아니라
  '함께 찾아야 할 사람'의 역할을 적으세요. 최대 4개.
- recommended_room_ids는 주어진 모집 중인 방 목록에서만 고릅니다. 목표와 관련이 높은 순서로
  나열하고, 관련 없는 방은 넣지 마세요. 맞는 방이 하나도 없으면 빈 배열로 두세요.
- 목록에 없는 id를 지어내지 마세요."""


class GoalAnalysisOut(BaseModel):
    normalized_goal: str = Field(description="목표를 한 문장으로 다듬은 것")
    keywords: list[str] = Field(description="목표를 대표하는 키워드")
    suggested_room_type: Literal[
        "competition", "hackathon", "study", "project", "coffee_chat", "networking"
    ]
    suggested_roles: list[str] = Field(description="함께 찾아야 할 사람의 역할")
    recommended_room_ids: list[str] = Field(description="관련도 높은 순서의 방 id")


def analyze_goal(text: str, keywords: list[str], rooms: list[Room]) -> GoalAnalysisResult:
    room_payload = [
        {
            "id": room.id,
            "title": room.title,
            "type": room.type,
            "summary": room.summary,
            "tags": room.tags,
            "requiredRoles": room.required_roles,
            "memberCount": room.member_count,
            "capacity": room.capacity,
        }
        for room in rooms
    ]

    payload = {
        "goalText": text,
        "goalKeywords": keywords,
        "openRooms": room_payload,
    }

    result = run_agent(
        name="goal",
        system=SYSTEM,
        user=f"다음 목표를 해석하세요.\n\n{as_json(payload)}",
        schema=GoalAnalysisOut,
        effort="medium",
    )

    # 모델이 없는 방 id를 지어내면 걸러낸다.
    known = {room.id for room in rooms}
    room_ids = [room_id for room_id in result.recommended_room_ids if room_id in known]

    return GoalAnalysisResult(
        normalized_goal=result.normalized_goal,
        keywords=result.keywords,
        suggested_room_type=result.suggested_room_type,
        suggested_roles=result.suggested_roles[:4],
        recommended_room_ids=room_ids,
    )
