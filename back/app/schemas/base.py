from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel


def to_iso_z(value: datetime) -> str:
    """계약서 §7: 날짜는 UTC ISO 8601 (`...Z`)."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


IsoDatetime = Annotated[datetime, PlainSerializer(to_iso_z, return_type=str)]


class CamelModel(BaseModel):
    """프론트 `types/domain.ts`가 camelCase를 쓰므로 응답도 camelCase로 직렬화한다."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
