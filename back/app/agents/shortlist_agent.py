"""3. 추천 후보군 형성 에이전트.

전체 목록에서 '가능성 있는 것'을 넓게 추린다. 여기서는 순위를 매기지 않는다 —
빠르고 싸게 걸러내는 것이 목적이고, 순위는 선별 에이전트가 맡는다.

방(사용자에게 추천할 인연)과 사람(방장에게 추천할 초대 후보) 양쪽에 쓰인다.
"""

from pydantic import BaseModel, Field

from app.agents.base import as_json, run_agent
from app.core.config import settings

SYSTEM = """당신은 협업 팀 매칭 서비스 '연(緣)'의 후보군 선별자입니다.

주어진 목록에서 '검토할 가치가 있는' 항목만 남기세요. 이 단계는 넓게 거르는 단계입니다.
순위를 매기거나 자세한 이유를 쓸 필요는 없습니다.

규칙:
- 목록에 있는 id만 사용하세요. 지어내지 마세요.
- 애매하면 남기세요. 확실히 관련 없는 것만 버립니다.
- 관련 있는 것이 하나도 없으면 빈 배열을 돌려주세요. 억지로 채우지 마세요.
- 상한을 넘기지 마세요."""


class ShortlistOut(BaseModel):
    ids: list[str] = Field(description="검토할 가치가 있는 항목의 id")


def shortlist(
    *,
    subject: str,
    seeker: dict,
    items: list[dict],
    limit: int | None = None,
) -> list[str]:
    """`items` 중 남길 id 목록을 돌려준다.

    subject: 무엇을 고르는지 사람이 읽을 설명 (프롬프트에 들어간다)
    seeker:  누구를 위해 고르는지 (사용자 프로필 또는 방)
    """
    if not items:
        return []

    cap = limit or settings.analysis_shortlist_size

    # 목록이 상한보다 작으면 걸러낼 것이 없다. LLM을 부르지 않는다.
    if len(items) <= cap:
        return [item["id"] for item in items]

    payload = {
        "goal": subject,
        "seeker": seeker,
        "candidates": items,
        "maxResults": cap,
    }

    result = run_agent(
        name="shortlist",
        system=SYSTEM,
        user=f"다음 목록에서 후보군을 추리세요.\n\n{as_json(payload)}",
        schema=ShortlistOut,
        effort="low",  # 기계적인 걸러내기라 깊게 생각할 필요가 없다.
    )

    known = {item["id"] for item in items}
    return [item_id for item_id in result.ids if item_id in known][:cap]
