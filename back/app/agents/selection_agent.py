"""4. 추천 대상 선별 에이전트.

후보군 중에서 실제로 추천할 것을 고르고, 점수와 '왜 이 사람/이 방인지'를 쓴다.
이 이유 문구가 화면에 그대로 노출되므로 4개 에이전트 중 가장 높은 effort를 준다.
"""

from pydantic import BaseModel, Field

from app.agents.base import as_json, clamp_score, run_agent
from app.services.analysis import CandidateScore

SYSTEM = """당신은 협업 팀 매칭 서비스 '연(緣)'의 추천 담당자입니다.

후보 목록을 받아, 얼마나 잘 맞는지 점수를 매기고 그 이유를 씁니다.
당신이 쓴 이유는 사용자에게 그대로 보입니다.

점수(score)는 0~100입니다.
- 90 이상: 필요한 역할과 방향이 정확히 맞는다
- 70~89: 잘 맞지만 아쉬운 점이 있다
- 50~69: 접점은 있으나 확신은 어렵다
- 50 미만: 굳이 추천할 이유가 없다

이유(reason) 규칙:
- 한 문장, 한국어. 사용자에게 말하듯 씁니다.
- 무엇이 어떻게 맞는지 구체적으로 씁니다. "잘 맞아요" 같은 빈 말은 쓰지 마세요.
- 상호보완 관계(내게 없는 역량을 상대가 가졌다)를 특히 잘 짚어 주세요.
- 프로필에 없는 사실을 지어내지 마세요.
- 공개되지 않은 민감한 정보나 성격 추측을 근거로 쓰지 마세요.

주어진 id만 사용하고, 관련이 약한 항목은 빼세요. 억지로 채우지 마세요."""


class RankedItemOut(BaseModel):
    id: str
    score: int = Field(description="0~100 사이의 적합도")
    reason: str = Field(description="사용자에게 보여줄 한 문장짜리 추천 이유")


class SelectionOut(BaseModel):
    items: list[RankedItemOut]


def select(*, subject: str, seeker: dict, candidates: list[dict]) -> dict[str, CandidateScore]:
    """후보를 점수와 이유가 붙은 표로 바꾼다. 키는 후보 id."""
    if not candidates:
        return {}

    payload = {
        "goal": subject,
        "seeker": seeker,
        "candidates": candidates,
    }

    result = run_agent(
        name="selection",
        system=SYSTEM,
        user=f"다음 후보를 평가하세요.\n\n{as_json(payload)}",
        schema=SelectionOut,
        effort="high",  # 사용자에게 그대로 보이는 문구라 품질이 중요하다.
        max_tokens=8192,
    )

    known = {candidate["id"] for candidate in candidates}
    return {
        item.id: CandidateScore(score=clamp_score(item.score), reason=item.reason.strip())
        for item in result.items
        if item.id in known
    }
