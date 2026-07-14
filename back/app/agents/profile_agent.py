"""1. 프로필 분석 에이전트.

사용자가 온보딩에서 적은 자기소개·스킬·관심사를 읽고, 추천에 쓸 수 있는 형태로 정리한다.
강점은 계약서 §6의 `{ key, label, level: 1|2|3 }` 형태를 그대로 따른다.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.agents.base import as_json, run_agent
from app.services.analysis import PersonView, ProfileInsight, Strength

SYSTEM = """당신은 협업 팀 매칭 서비스 '연(緣)'의 프로필 분석가입니다.

사용자가 직접 쓴 프로필을 읽고, 추천 엔진이 쓸 수 있는 구조로 정리하세요.

규칙:
- 한국어로, 사용자를 향해 말하듯 자연스럽게 씁니다.
- 사용자가 쓰지 않은 사실을 만들어내지 마세요. 근거가 없으면 비워 두거나 일반적으로 씁니다.
- strengths는 프로필에서 실제로 드러난 역량만 담습니다. level은 근거가 뚜렷할수록 높게(3),
  한 번 언급된 정도면 낮게(1) 매깁니다. 최대 5개.
- derivedTags는 검색·매칭에 쓸 짧은 명사구입니다. 최대 8개.
- 성격이나 민감한 개인 정보를 추측해 적지 마세요."""


class StrengthOut(BaseModel):
    key: str = Field(description="영문 소문자 슬러그. 예: backend-api")
    label: str = Field(description="사용자에게 보여줄 한국어 강점 이름")
    level: Literal[1, 2, 3] = Field(description="근거의 뚜렷함. 3이 가장 뚜렷함")


class ProfileInsightOut(BaseModel):
    summary: str = Field(description="이 사람을 한두 문장으로 소개하는 글")
    collaboration_style: str = Field(description="어떤 협업 방식을 선호하는지 한 문장")
    derived_tags: list[str] = Field(description="매칭에 쓸 짧은 태그")
    strengths: list[StrengthOut]


def analyze_profile(person: PersonView) -> ProfileInsight:
    payload = {
        "name": person.name,
        "role": person.role,
        "bio": person.bio,
        "collabStyle": person.collab_style,
        "skillTags": person.skill_tags,
        "interests": person.interests,
    }

    result = run_agent(
        name="profile",
        system=SYSTEM,
        user=f"다음 프로필을 분석하세요.\n\n{as_json(payload)}",
        schema=ProfileInsightOut,
        effort="medium",
    )

    return ProfileInsight(
        summary=result.summary,
        collaboration_style=result.collaboration_style,
        derived_tags=result.derived_tags[:8],
        strengths=[
            Strength(key=item.key, label=item.label, level=item.level) for item in result.strengths[:5]
        ],
    )
