from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel


class SessionAnalyticsResponse(BaseModel):
    session_id: str
    user_id: str
    task_type: str
    mean_rt: float
    median_rt: float
    rt_std: float
    rt_cv: float
    accuracy: float
    commission_errors: Optional[int] = None
    omission_errors: Optional[int] = None
    computed_at: datetime


class BaselineResponse(BaseModel):
    metric_name: str
    baseline_mean: float
    baseline_std: float
    baseline_median: float
    session_count: int
    updated_at: datetime


class ZScoreResponse(BaseModel):
    session_id: str
    user_id: str
    metric_name: str
    current_value: float
    baseline_mean: float
    baseline_std: float
    z_score: float
    computed_at: datetime


class TrendSession(BaseModel):
    session_id: str
    session_number: int
    start_time: datetime
    mean_rt: float
    median_rt: float
    rt_cv: float
    accuracy: float
    z_scores: Dict[str, float]


class TrendResponse(BaseModel):
    sessions: List[TrendSession]


class AnomalyResponse(BaseModel):
    session_id: str
    user_id: str
    anomaly_score: float
    is_anomaly: bool
    features: Dict[str, float]
    computed_at: datetime


class InsightResponse(BaseModel):
    insight_type: str
    title: str
    description: str
    severity: str
    created_at: datetime
    metadata: Optional[Dict] = None