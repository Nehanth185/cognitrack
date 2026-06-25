from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from app.core.database import get_db
from app.models.analytics import SessionAnalytics, Baseline, AnomalyResult, Insight
from app.schemas.analytics import TrendResponse, BaselineResponse, ZScoreResponse, AnomalyResponse, InsightResponse

router = APIRouter()


@router.get("/analytics/trends/{user_id}", response_model=TrendResponse)
def get_trends(user_id: str, db: Session = Depends(get_db)):
    analytics = db.query(SessionAnalytics).filter(SessionAnalytics.user_id == user_id).all()

    sessions_dict = {}
    for a in analytics:
        if a.session_id not in sessions_dict:
            sessions_dict[a.session_id] = {
                "session_id": a.session_id,
                "session_number": 0,
                "start_time": a.computed_at,
                "mean_rt": 0,
                "median_rt": 0,
                "rt_cv": 0,
                "accuracy": 0,
                "z_scores": {},
            }
        sessions_dict[a.session_id][f"{a.task_type}_mean_rt"] = a.mean_rt
        sessions_dict[a.session_id][f"{a.task_type}_median_rt"] = a.median_rt
        sessions_dict[a.session_id][f"{a.task_type}_rt_cv"] = a.rt_cv
        sessions_dict[a.session_id][f"{a.task_type}_accuracy"] = a.accuracy

    baselines = db.query(Baseline).filter(Baseline.user_id == user_id).all()
    baseline_dict = {b.metric_name: b for b in baselines}

    for sess in sessions_dict.values():
        z_scores = {}
        for key in ["simple_reaction_mean_rt", "choice_reaction_mean_rt", "go_no_go_mean_rt",
                    "simple_reaction_rt_cv", "choice_reaction_rt_cv", "go_no_go_rt_cv",
                    "simple_reaction_accuracy", "choice_reaction_accuracy", "go_no_go_accuracy"]:
            if key in sess and key in baseline_dict:
                b = baseline_dict[key]
                if b.baseline_std > 0:
                    z_scores[key] = (sess[key] - b.baseline_mean) / b.baseline_std
        sess["z_scores"] = z_scores

    return TrendResponse(sessions=list(sessions_dict.values()))


@router.get("/analytics/baseline/{user_id}", response_model=List[BaselineResponse])
def get_baselines(user_id: str, db: Session = Depends(get_db)):
    baselines = db.query(Baseline).filter(Baseline.user_id == user_id).all()
    return [
        BaselineResponse(
            metric_name=b.metric_name,
            baseline_mean=b.baseline_mean,
            baseline_std=b.baseline_std,
            baseline_median=b.baseline_median,
            session_count=b.session_count,
            updated_at=b.updated_at,
        )
        for b in baselines
    ]


@router.get("/analytics/zscores/{user_id}", response_model=List[ZScoreResponse])
def get_zscores(user_id: str, db: Session = Depends(get_db)):
    analytics = db.query(SessionAnalytics).filter(SessionAnalytics.user_id == user_id).all()
    baselines = db.query(Baseline).filter(Baseline.user_id == user_id).all()
    baseline_dict = {b.metric_name: b for b in baselines}

    z_scores = []
    for a in analytics:
        for key, value in [
            ("mean_rt", a.mean_rt),
            ("median_rt", a.median_rt),
            ("rt_cv", a.rt_cv),
            ("accuracy", a.accuracy),
        ]:
            metric_name = f"{a.task_type}_{key}"
            if metric_name in baseline_dict:
                b = baseline_dict[metric_name]
                if b.baseline_std > 0:
                    z_scores.append(ZScoreResponse(
                        session_id=a.session_id,
                        user_id=a.user_id,
                        metric_name=metric_name,
                        current_value=value,
                        baseline_mean=b.baseline_mean,
                        baseline_std=b.baseline_std,
                        z_score=(value - b.baseline_mean) / b.baseline_std,
                        computed_at=a.computed_at,
                    ))
    return z_scores


@router.get("/analytics/anomalies/{user_id}", response_model=List[AnomalyResponse])
def get_anomalies(user_id: str, db: Session = Depends(get_db)):
    anomalies = db.query(AnomalyResult).filter(AnomalyResult.user_id == user_id).order_by(AnomalyResult.computed_at.desc()).limit(50).all()
    return [
        AnomalyResponse(
            session_id=a.session_id,
            user_id=a.user_id,
            anomaly_score=a.anomaly_score,
            is_anomaly=a.is_anomaly,
            features=a.features,
            computed_at=a.computed_at,
        )
        for a in anomalies
    ]


@router.get("/analytics/insights/{user_id}", response_model=List[InsightResponse])
def get_insights(user_id: str, db: Session = Depends(get_db)):
    insights = db.query(Insight).filter(Insight.user_id == user_id).order_by(Insight.created_at.desc()).limit(20).all()
    return [
        InsightResponse(
            insight_type=i.insight_type,
            title=i.title,
            description=i.description,
            severity=i.severity,
            created_at=i.created_at,
            metadata=i.metadata,
        )
        for i in insights
    ]