import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.session import Session
from app.models.trial import Trial
from app.models.analytics import SessionAnalytics, Baseline, AnomalyResult, Insight

router = APIRouter()


@router.get("/export/csv/{user_id}")
def export_user_data(user_id: str, db: Session = Depends(get_db)):
    sessions = db.query(Session).filter(Session.user_id == user_id).order_by(Session.session_number).all()
    if not sessions:
        raise HTTPException(status_code=404, detail="No data found for user")

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["type", "session_id", "session_number", "task_type", "trial_number", "block_number",
                     "stimulus", "correct_response", "user_response", "reaction_time", "accuracy",
                     "timestamp", "mean_rt", "median_rt", "rt_std", "rt_cv", "accuracy_rate",
                     "commission_errors", "omission_errors"])

    for session in sessions:
        writer.writerow(["session", session.session_id, session.session_number, "", "", "",
                         "", "", "", "", "", session.start_time.isoformat(), "", "", "", "", "", "", ""])

        trials = db.query(Trial).filter(Trial.session_id == session.session_id).order_by(Trial.trial_number).all()
        for trial in trials:
            writer.writerow(["trial", session.session_id, session.session_number, trial.task_type,
                             trial.trial_number, trial.block_number, trial.stimulus,
                             trial.correct_response, trial.user_response, trial.reaction_time,
                             trial.accuracy, trial.timestamp.isoformat(), "", "", "", "", "", "", ""])

        analytics = db.query(SessionAnalytics).filter(SessionAnalytics.session_id == session.session_id).all()
        for a in analytics:
            writer.writerow(["analytics", session.session_id, session.session_number, a.task_type, "", "",
                             "", "", "", "", "", "", a.mean_rt, a.median_rt, a.rt_std, a.rt_cv,
                             a.accuracy, a.commission_errors or "", a.omission_errors or ""])

    baselines = db.query(Baseline).filter(Baseline.user_id == user_id).all()
    for b in baselines:
        writer.writerow(["baseline", "", "", b.metric_name, "", "",
                         "", "", "", "", "", "", b.baseline_mean, b.baseline_median, b.baseline_std, "",
                         b.session_count, "", ""])

    anomalies = db.query(AnomalyResult).filter(AnomalyResult.user_id == user_id).all()
    for a in anomalies:
        writer.writerow(["anomaly", a.session_id, "", "", "", "",
                         "", "", "", "", "", a.anomaly_score, a.is_anomaly, "", "",
                         "", "", "", ""])

    insights = db.query(Insight).filter(Insight.user_id == user_id).all()
    for i in insights:
        writer.writerow(["insight", "", "", i.insight_type, "", "",
                         "", "", "", "", "", i.title, i.description, i.severity, "",
                         "", "", "", ""])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cognitrack-{user_id[:8]}.csv"}
    )