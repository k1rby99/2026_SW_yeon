"""에이전트 공통 실행기.

모든 에이전트는 `run_agent()` 하나를 통해 Claude를 호출한다. 모델 ID, thinking 설정,
구조화 출력, 오류 처리를 여기 한 곳에만 둔다.

설계 메모:
- 구조화 출력은 `messages.parse()` + Pydantic 스키마로 강제한다. JSON 파싱과 검증을
  SDK가 해주므로 응답 형식이 어긋나면 예외로 드러난다.
- `thinking: adaptive` — Claude가 문제 난이도에 맞춰 스스로 사고량을 정한다.
- 프롬프트 캐싱은 넣지 않았다. Opus 4.8의 최소 캐시 길이는 4096토큰인데 우리 시스템
  프롬프트는 그보다 훨씬 짧아 `cache_control`을 붙여도 조용히 캐시되지 않는다.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Literal, TypeVar

import anthropic
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

Effort = Literal["low", "medium", "high", "xhigh", "max"]
T = TypeVar("T", bound=BaseModel)

_client: anthropic.Anthropic | None = None


class AgentUnavailable(RuntimeError):
    """에이전트를 호출할 수 없다. 호출부는 목업으로 떨어지거나 503을 낸다."""


def get_client() -> anthropic.Anthropic:
    """키를 명시하지 않으면 SDK가 환경변수(ANTHROPIC_API_KEY)나 `ant auth login` 프로필에서
    자격증명을 찾는다. 인증 실패는 호출 시점에 APIError로 드러난다."""
    global _client
    if _client is None:
        try:
            _client = (
                anthropic.Anthropic(api_key=settings.anthropic_api_key)
                if settings.anthropic_api_key
                else anthropic.Anthropic()
            )
        except anthropic.AnthropicError as error:
            raise AgentUnavailable(
                f"Anthropic 자격증명을 찾을 수 없습니다: {error}. "
                "YEON_ANTHROPIC_API_KEY를 설정하거나 YEON_ANALYSIS_ENGINE=mock 으로 두세요."
            ) from error
    return _client


def as_json(payload: Any) -> str:
    """프롬프트에 끼워 넣을 입력을 JSON으로 직렬화한다."""
    return json.dumps(payload, ensure_ascii=False, indent=2)


def run_agent(
    *,
    name: str,
    system: str,
    user: str,
    schema: type[T],
    effort: Effort = "medium",
    max_tokens: int = 4096,
) -> T:
    """에이전트를 한 번 호출하고 검증된 결과 객체를 돌려준다."""
    try:
        response = get_client().messages.parse(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system,
            thinking={"type": "adaptive"},
            output_config={"effort": effort},
            messages=[{"role": "user", "content": user}],
            output_format=schema,
        )
    except AgentUnavailable:
        raise
    except (anthropic.AnthropicError, ValueError) as error:
        # APIError(레이트 리밋·서버 오류)와 구조화 출력 검증 실패를 함께 받는다.
        raise AgentUnavailable(f"[{name}] Claude 호출 실패: {error}") from error
    except TypeError as error:
        # 자격증명이 하나도 없으면 SDK가 요청을 만들기 전에 TypeError로 죽는다.
        # AnthropicError가 아니므로 위에서 잡히지 않는다.
        raise AgentUnavailable(f"[{name}] Anthropic 자격증명이 없습니다: {error}") from error

    if response.stop_reason == "refusal":
        raise AgentUnavailable(f"[{name}] 모델이 요청을 거절했습니다.")

    parsed = response.parsed_output
    if parsed is None:
        raise AgentUnavailable(f"[{name}] 구조화 출력을 파싱하지 못했습니다.")

    usage = response.usage
    logger.info(
        "agent=%s effort=%s input=%s output=%s",
        name,
        effort,
        usage.input_tokens,
        usage.output_tokens,
    )
    return parsed


def clamp_score(value: int) -> int:
    """모델이 범위를 벗어난 점수를 내도 UI가 깨지지 않게 0~100으로 눌러 담는다."""
    return max(0, min(100, int(value)))
