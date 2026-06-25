from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.session import Session
from app.models.trial import Trial
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, SessionSummary
from app.services.analytics import compute_session_analytics, update_baselines, detect_anomalies, generate_insights

router = APIRouter()


@router.post("/sessions", response_model=SessionResponse)
def create_session(session_data: SessionCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == session_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session_count = db.query(Session).filter(Session.user_id == session_data.user_id).count()
    session = Session(
        session_id="",
        user_id=session_data.user_id,
        session_number=session_count + 1,
        tasks_completed=[],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse(session_id=session.session_id, session_number=session.session_number)


@router.get("/sessions/{session_id}", response_model=SessionSummary)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(Session).filter(Session.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionSummary(
        session_id=session.session_id,
        user_id=session.user_id,
        start_time=session.start_time,
        end_time=session.end_time,
        session_number=session.session_number,
        completion_rate=session.completion_rate,
        tasks_completed=session.tasks_completed,
        created_at=session.created_at,
    )


@router.get("/sessions/user/{user_id}", response_model=List[SessionSummary])
def get_user_sessions(user_id: str, db: Session = Depends(get_db)):
    sessions = db.query(Session).filter(Session.user_id == user_id).order_by(Session.session_number).all()
    return [
        SessionSummary(
            session_id=s.session_id,
            user_id=s.user_id,
            start_time=s.start_time,
            end_time=s.end_time,
            session_number=s.session_number,
            completion_rate=s.completion_rate,
            tasks_completed=s.tasks_completed,
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.patch("/sessions/{session_id}/complete")
def complete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(Session).filter(Session.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.end_time = datetime.utcnow()

    trial_count = db.query(Trial).filter(Trial.session_id == session_id).count()
    expected_trials = 150
    session.completion_rate = min(trial_count / expected_trials, 1.0) if expected_trials > 0 else 0

    analytics_results = compute_session_analytics(db, session_id, session.user_id)
    update_baselines(db, session.user_id, analytics_results)
    detect_anomalies(db, session_id, session.user_id, analytics_results)
    generate_insights(db, session.user_id, session_id, analytics_results)

    db.commit()

    return {
        "session_id": session.session_id,
        "analytics": analytics_results,
        "message": "Session completed and analytics computed",
    }