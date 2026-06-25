from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.config import settings
from app.models.trial import Trial
from app.models.session import Session
from app.schemas.trial import TrialBatchCreate, TrialResponse

router = APIRouter()


@router.post("/trials/batch")
def create_trials_batch(batch: TrialBatchCreate, db: Session = Depends(get_db)):
    session = db.query(Session).filter(Session.session_id == batch.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    valid_trials = []
    for t in batch.trials:
        if t.reaction_time is not None:
            if t.reaction_time < settings.RT_VALID_MIN or t.reaction_time > settings.RT_VALID_MAX:
                continue
        valid_trials.append(Trial(
            trial_id=t.trial_id,
            session_id=batch.session_id,
            user_id=session.user_id,
            task_type=t.task_type,
            stimulus=t.stimulus,
            correct_response=t.correct_response,
            user_response=t.user_response,
            reaction_time=t.reaction_time,
            accuracy=t.accuracy,
            timestamp=t.timestamp,
            trial_number=t.trial_number,
            block_number=t.block_number,
            device_type=t.device_type,
            browser=t.browser,
        ))

    db.bulk_save_objects(valid_trials)
    db.commit()

    return {"saved": len(valid_trials), "filtered": len(batch.trials) - len(valid_trials)}


@router.get("/trials/session/{session_id}", response_model=List[TrialResponse])
def get_session_trials(session_id: str, db: Session = Depends(get_db)):
    trials = db.query(Trial).filter(Trial.session_id == session_id).order_by(Trial.trial_number).all()
    return [
        TrialResponse(
            trial_id=t.trial_id,
            session_id=t.session_id,
            task_type=t.task_type,
            stimulus=t.stimulus,
            correct_response=t.correct_response,
            user_response=t.user_response,
            reaction_time=t.reaction_time,
            accuracy=t.accuracy,
            timestamp=t.timestamp,
            trial_number=t.trial_number,
            block_number=t.block_number,
        )
        for t in trials
    ]