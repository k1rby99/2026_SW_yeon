import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.errors import register_error_handlers
from app.models import *  # noqa: F401,F403  — create_all이 모든 테이블을 보게 한다
from app.seed import seed_demo_data


# uvicorn은 루트 로거에 핸들러를 달지 않는다. 이 설정이 없으면 에이전트의 토큰 사용량과
# 캐시 적중 로그가 어디에도 출력되지 않는다.
logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(name)s | %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed_demo_data(db)
    yield


app = FastAPI(title="Yeon API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)
app.include_router(api_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "yeon-backend"}
