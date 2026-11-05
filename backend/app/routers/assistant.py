from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.deps import DB, CurrentUser
from app.schemas.assistant import AssistantStatus, ChatIn, ChatOut
from app.services import agent

router = APIRouter(tags=["assistant"])

_ERRORS = {
    "unavailable": (status.HTTP_503_SERVICE_UNAVAILABLE, "assistant_unavailable"),
    "busy": (status.HTTP_503_SERVICE_UNAVAILABLE, "assistant_busy"),
    "failed": (status.HTTP_502_BAD_GATEWAY, "assistant_failed"),
}


def _today(sent: date | None) -> date:
    # Trust the browser's date only within a day of the server's, to handle time zones.
    server = datetime.now(timezone.utc).date()
    if sent and abs((sent - server).days) <= 1:
        return sent
    return server


@router.get("/assistant/status", response_model=AssistantStatus)
def assistant_status() -> dict:
    """Lets the app show a friendly message when no API key is configured."""
    return {"available": bool(get_settings().groq_api_key)}


@router.post("/assistant/chat", response_model=ChatOut)
@limiter.limit("15/minute;200/day")
def chat(request: Request, body: ChatIn, user: CurrentUser, db: DB) -> dict:
    try:
        result = agent.run(
            db, user, [m.model_dump() for m in body.messages], body.lang, _today(body.today), body.recipe_slug
        )
    except agent.AgentError as exc:
        code, detail = _ERRORS[exc.code]
        raise HTTPException(code, detail=detail) from exc
    return {"reply": result.reply, "recipes": result.recipes, "actions": result.actions}
