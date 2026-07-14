"""에이전트 추천 결과의 DB 캐시.

에이전트 호출은 느리고(목록 하나에 10초) 비싸다. 입력이 그대로면 결과도 그대로이므로,
입력의 해시가 같으면 저장된 결과를 그대로 돌려준다.

무효화는 TTL이 아니라 **입력 변화**로 한다. 프로필을 고치거나 방이 늘면 지문이 달라져
자동으로 다시 계산된다. 시간이 지났다는 이유만으로 같은 답을 다시 사는 것은 낭비다.
"""

import hashlib
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import ScoreCache, utcnow
from app.services.analysis import CandidateScore


def _hash(payload: Any) -> str:
    # sort_keys 없이 직렬화하면 키 순서가 흔들려 같은 입력이 다른 지문을 얻는다.
    text = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(text.encode()).hexdigest()[:32]


def scope_of(items: list[dict]) -> str:
    """대상 id 집합에서 스코프를 만든다.

    추천 목록(방 5개)과 상세 화면(방 1개)은 대상 집합이 다르므로 서로 다른 행에 저장된다.
    이렇게 하지 않으면 상세 화면이 목록의 캐시를 덮어써 목록이 매번 다시 계산된다.
    """
    return _hash(sorted(item["id"] for item in items))


def fingerprint_of(seeker: dict, items: list[dict]) -> str:
    """입력 전체의 지문. 모델을 바꾸면 결과도 달라지므로 함께 넣는다."""
    return _hash({"model": settings.anthropic_model, "seeker": seeker, "items": items})


class DbScoreCache:
    def __init__(self, db: Session) -> None:
        self._db = db

    def _row(self, viewer_id: str, kind: str, scope: str) -> ScoreCache | None:
        return self._db.scalar(
            select(ScoreCache).where(
                ScoreCache.viewer_id == viewer_id,
                ScoreCache.kind == kind,
                ScoreCache.scope == scope,
            )
        )

    def get(
        self, viewer_id: str, kind: str, scope: str, fingerprint: str
    ) -> dict[str, CandidateScore] | None:
        row = self._row(viewer_id, kind, scope)
        if row is None or row.fingerprint != fingerprint:
            return None
        return {
            target_id: CandidateScore(score=value["score"], reason=value["reason"])
            for target_id, value in row.payload.items()
        }

    def put(
        self,
        viewer_id: str,
        kind: str,
        scope: str,
        fingerprint: str,
        scores: dict[str, CandidateScore],
    ) -> None:
        payload = {
            target_id: {"score": score.score, "reason": score.reason}
            for target_id, score in scores.items()
        }

        row = self._row(viewer_id, kind, scope)
        if row is None:
            row = ScoreCache(viewer_id=viewer_id, kind=kind, scope=scope)
            self._db.add(row)

        row.fingerprint = fingerprint
        row.payload = payload
        row.updated_at = utcnow()
        self._db.commit()
