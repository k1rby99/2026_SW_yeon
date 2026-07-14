from fastapi import APIRouter

from app.api import auth, goals, invitations, matching, opportunities, profile, rooms

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(rooms.router)
api_router.include_router(goals.router)
api_router.include_router(opportunities.router)
api_router.include_router(invitations.router)
api_router.include_router(matching.router)
