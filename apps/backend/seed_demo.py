"""Seed demo data for CogniTrack - creates 3 demo sessions with baseline data."""

import sys
import os
import random
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.core.database import SessionLocal, engine
from app.core.config import settings
from app.models import User, Session, Trial, SessionAnalytics, Baseline

def create_demo_user(db):
    user = User(user_id="demo-user-123")
    db.add(user)
    db.commit()
    return user

def create_demo_sessions(db, user_id):
    task_types = ["simple_reaction", "choice_reaction", "go_no_go"]
    
    for session_num in range(1, 4):
        # Create session
        start_time = datetime.utcnow() - timedelta(days=3-session_num, hours=random.randint(9, 17))
        end_time = start_time + timedelta(minutes=random.randint(10, 15))
        
        session = Session(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            start_time=start_time,
            end_time=end_time,
            session_number=session_num,
            completion_rate=0.95,
            tasks_completed=task_types,
            created_at=start_time,
        )
        db.add(session)
        db.commit()
        
        # Generate trials and analytics for each task
        for task_type in task_types:
            generate_task_data(db, session, task_type)
        
        print(f"Created session {session_num} with {len(task_types)} tasks")

def generate_task_data(db, session, task_type):
    trial_count = {"simple_reaction": 30, "choice_reaction": 40, "go_no_go": 80}[task_type]
    base_rt = {"simple_reaction": 280, "choice_reaction": 350, "go_no_go": 400}[task_type]
    
    trials = []
    valid_rts = []
    correct_count = 0
    
    for i in range(trial_count):
        # Generate realistic RT with some noise
        rt = base_rt + random.gauss(0, 30)
        rt = max(150, min(3000, rt))
        
        # Occasional errors/omissions
        is_correct = random.random() > 0.05
        user_rt = rt if is_correct else None
        
        trial = Trial(
            trial_id=str(uuid.uuid4()),
            session_id=session.session_id,
            user_id=session.user_id,
            task_type=task_type,
            stimulus=get_stimulus(task_type),
            correct_response=get_correct_response(task_type),
            user_response="Space" if is_correct else None,
            reaction_time=rt if is_correct else None,
            accuracy=is_correct,
            timestamp=session.start_time + timedelta(seconds=i*2),
            trial_number=i+1,
            block_number=1,
        )
        trials.append(trial)
        
        if is_correct:
            valid_rts.append(rt)
            correct_count += 1
    
    db.bulk_save_objects(trials)
    
    # Compute analytics
    mean_rt = sum(valid_rts) / len(valid_rts) if valid_rts else 0
    median_rt = sorted(valid_rts)[len(valid_rts)//2] if valid_rts else 0
    rt_std = (sum((x - mean_rt)**2 for x in valid_rts) / len(valid_rts))**0.5 if valid_rts else 0
    rt_cv = rt_std / mean_rt if mean_rt > 0 else 0
    accuracy = correct_count / trial_count
    
    analytics = SessionAnalytics(
        session_id=session.session_id,
        user_id=session.user_id,
        task_type=task_type,
        mean_rt=mean_rt,
        median_rt=median_rt,
        rt_std=rt_std,
        rt_cv=rt_cv,
        accuracy=accuracy,
    )
    db.add(analytics)
    
    # Update baselines
    update_baseline(db, session.user_id, f"{task_type}_mean_rt", mean_rt)
    update_baseline(db, session.user_id, f"{task_type}_median_rt", median_rt)
    update_baseline(db, session.user_id, f"{task_type}_rt_cv", rt_cv)
    update_baseline(db, session.user_id, f"{task_type}_accuracy", accuracy)

def update_baseline(db, user_id, metric_name, value):
    # Get existing sessions for this metric
    existing = db.query(SessionAnalytics).filter(
        SessionAnalytics.user_id == user_id,
        SessionAnalytics.task_type.like(f"{metric_name.split('_')[0]}%")
    ).all()
    
    if len(existing) < 3:
        # First few sessions - just store
        baseline = Baseline(
            user_id=user_id,
            metric_name=metric_name,
            baseline_mean=value,
            baseline_std=0.1,
            baseline_median=value,
            session_count=len(existing) + 1,
        )
        db.add(baseline)
    else:
        # EWMA update
        baseline = db.query(Baseline).filter(
            Baseline.user_id == user_id,
            Baseline.metric_name == metric_name
        ).first()
        if baseline:
            baseline.baseline_mean = 0.9 * baseline.baseline_mean + 0.1 * value
            baseline.baseline_std = 0.9 * baseline.baseline_std + 0.1 * 0.1
            baseline.baseline_median = 0.9 * baseline.baseline_median + 0.1 * value
            baseline.session_count += 1

def get_stimulus(task_type):
    if task_type == "simple_reaction":
        return "green_screen"
    elif task_type == "choice_reaction":
        return random.choice(["left_arrow", "right_arrow"])
    else:
        return random.choice(["letter_x", "letter_y"])

def get_correct_response(task_type):
    if task_type == "simple_reaction":
        return "Space"
    elif task_type == "choice_reaction":
        return random.choice(["ArrowLeft", "ArrowRight"])
    else:
        return "Space"

if __name__ == "__main__":
    db = SessionLocal()
    try:
        # Check if demo user exists
        user = db.query(User).filter(User.user_id == "demo-user-123").first()
        if not user:
            create_demo_user(db)
        
        create_demo_sessions(db, "demo-user-123")
        db.commit()
        print("Demo data seeded successfully!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()
