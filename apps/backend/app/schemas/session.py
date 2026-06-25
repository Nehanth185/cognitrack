from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class SessionCreate(BaseModel):
    user_id: str


class SessionResponse(BaseModel):
    session_id: str
    session_number: int


class SessionSummary(BaseModel):
    session_id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    session_number: int
    completion_rate: Optional[float] = None
    tasks_completed: List[str] = []
    created_at: datetime