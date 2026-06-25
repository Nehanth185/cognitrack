from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class TrialCreate(BaseModel):
    trial_id: str
    task_type: str
    stimulus: str
    correct_response: str
    user_response: Optional[str] = None
    reaction_time: Optional[float] = None
    accuracy: Optional[bool] = None
    timestamp: datetime
    trial_number: int
    block_number: int = 1
    device_type: Optional[str] = None
    browser: Optional[str] = None


class TrialBatchCreate(BaseModel):
    session_id: str
    trials: List[TrialCreate]


class TrialResponse(BaseModel):
    trial_id: str
    session_id: str
    task_type: str
    stimulus: str
    correct_response: str
    user_response: Optional[str] = None
    reaction_time: Optional[float] = None
    accuracy: Optional[bool] = None
    timestamp: datetime
    trial_number: int
    block_number: int