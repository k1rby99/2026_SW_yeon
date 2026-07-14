from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Goal, GoalAnalysis, Room
from app.schemas.goal import GoalAnalysisResponse, GoalAnalyzeRequest, GoalCreateRequest, GoalResponse
from app.services.analysis import AnalysisAgent, get_analysis_agent

router = APIRouter(prefix="/api", tags=["goals"])

Agent = Annotated[AnalysisAgent, Depends(get_analysis_agent)]


@router.post("/goals/analyze", response_model=GoalAnalysisResponse)
def analyze_goal(
    payload: GoalAnalyzeRequest, user: CurrentUser, db: DbSession, agent: Agent
) -> GoalAnalysisResponse:
    if not payload.text.strip() and not payload.keywords:
        raise ApiError(400, "EMPTY_GOAL", "목표를 입력해주세요.")

    open_rooms = list(db.scalars(select(Room).where(Room.status == "recruiting")))
    result = agent.analyze_goal(payload.text, payload.keywords, open_rooms)

    record = GoalAnalysis(
        user_id=user.id,
        source_text=payload.text,
        normalized_goal=result.normalized_goal,
        keywords=result.keywords,
        suggested_room_type=result.suggested_room_type,
        suggested_roles=result.suggested_roles,
        recommended_room_ids=result.recommended_room_ids,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return GoalAnalysisResponse(
        id=record.id,
        normalized_goal=record.normalized_goal,
        keywords=record.keywords,
        suggested_room_type=record.suggested_room_type,
        suggested_roles=record.suggested_roles,
        recommended_room_ids=record.recommended_room_ids,
    )


@router.post("/goals", response_model=GoalResponse, status_code=201)
def create_goal(payload: GoalCreateRequest, user: CurrentUser, db: DbSession, agent: Agent) -> Goal:
    goal = Goal(user_id=user.id, text=payload.text, category=payload.category, status="processing")
    db.add(goal)
    db.flush()

    # 목업 엔진은 즉시 끝난다. 에이전트가 붙으면 여기서 비동기 작업을 띄우고 processing으로 남긴다.
    open_rooms = list(db.scalars(select(Room).where(Room.status == "recruiting")))
    result = agent.analyze_goal(payload.text, [payload.category] if payload.category else [], open_rooms)
    db.add(
        GoalAnalysis(
            user_id=user.id,
            goal_id=goal.id,
            source_text=payload.text,
            normalized_goal=result.normalized_goal,
            keywords=result.keywords,
            suggested_room_type=result.suggested_room_type,
            suggested_roles=result.suggested_roles,
            recommended_room_ids=result.recommended_room_ids,
        )
    )
    goal.status = "completed"

    db.commit()
    db.refresh(goal)
    return goal


@router.get("/goals", response_model=list[GoalResponse])
def list_goals(user: CurrentUser, db: DbSession) -> list[Goal]:
    return list(
        db.scalars(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at.desc()))
    )


@router.get("/goals/{goal_id}", response_model=GoalResponse)
def read_goal(goal_id: str, user: CurrentUser, db: DbSession) -> Goal:
    goal = db.get(Goal, goal_id)
    if goal is None or goal.user_id != user.id:
        raise ApiError(404, "GOAL_NOT_FOUND", "목표를 찾을 수 없어요.")
    return goal
