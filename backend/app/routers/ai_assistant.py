from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.services.ai_assistant import AIAssistantService
from app.models.employee import Employee
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

class AIQueryRequest(BaseModel):
    query: str

@router.post("")
def ask_assistant(
    request: AIQueryRequest,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AIAssistantService.process_query(db, request.query)
