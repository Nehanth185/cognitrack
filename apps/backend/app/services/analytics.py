import numpy as np
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.trial import Trial
from app.models.analytics import SessionAnalytics, Baseline, AnomalyResult, Insight
from app.core.config import settings


def compute_session_analytics(db: Session, session_id: str, user_id: str) -> List[Dict[str, Any]]:
    trials = db.query(Trial).filter(Trial.session_id == session_id).all()
    if not trials:
        return []

    task_types = set(t.task_type for t in trials)
    results = []

    for task_type in task_types:
        task_trials = [t for t in trials if t.task_type == task_type]
        valid_trials = [t for t in task_trials if t.reaction_time is not None and t.accuracy is not None]

        if not valid_trials:
            continue

        rts = [t.reaction_time for t in valid_trials]
        accuracies = [t.accuracy for t in valid_trials]

        mean_rt = float(np.mean(rts))
        median_rt = float(np.median(rts))
        rt_std = float(np.std(rts, ddof=1)) if len(rts) > 1 else 0.0
        rt_cv = rt_std / mean_rt if mean_rt > 0 else 0.0
        accuracy = float(np.mean(accuracies))

        commission_errors = None
        omission_errors = None

        if task_type == "go_no_go":
            go_trials = [t for t in valid_trials if t.stimulus == "letter_x"]
            nogo_trials = [t for t in valid_trials if t.stimulus == "letter_y"]
            commission_errors = sum(1 for t in nogo_trials if t.user_response == "Space")
            omission_errors = sum(1 for t in go_trials if t.user_response is None)

        analytics = SessionAnalytics(
            session_id=session_id,
            user_id=user_id,
            task_type=task_type,
            mean_rt=mean_rt,
            median_rt=median_rt,
            rt_std=rt_std,
            rt_cv=rt_cv,
            accuracy=accuracy,
            commission_errors=commission_errors,
            omission_errors=omission_errors,
        )
        db.add(analytics)

        results.append({
            "task_type": task_type,
            "mean_rt": mean_rt,
            "median_rt": median_rt,
            "rt_std": rt_std,
            "rt_cv": rt_cv,
            "accuracy": accuracy,
            "commission_errors": commission_errors,
            "omission_errors": omission_errors,
        })

    return results


def update_baselines(db: Session, user_id: str, session_analytics: List[Dict[str, Any]]) -> None:
    all_analytics = db.query(SessionAnalytics).filter(SessionAnalytics.user_id == user_id).all()

    metrics = {}
    for a in all_analytics:
        for key, value in [
            ("mean_rt", a.mean_rt),
            ("median_rt", a.median_rt),
            ("rt_std", a.rt_std),
            ("rt_cv", a.rt_cv),
            ("accuracy", a.accuracy),
        ]:
            metric_name = f"{a.task_type}_{key}"
            if metric_name not in metrics:
                metrics[metric_name] = []
            metrics[metric_name].append(value)

    for metric_name, values in metrics.items():
        if len(values) < settings.BASELINE_MIN_SESSIONS:
            continue

        mean_val = float(np.mean(values))
        std_val = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0
        median_val = float(np.median(values))

        baseline = db.query(Baseline).filter(
            Baseline.user_id == user_id,
            Baseline.metric_name == metric_name
        ).first()

        if baseline:
            baseline.baseline_mean = (1 - settings.BASELINE_EWMA_ALPHA) * baseline.baseline_mean + settings.BASELINE_EWMA_ALPHA * mean_val
            baseline.baseline_std = (1 - settings.BASELINE_EWMA_ALPHA) * baseline.baseline_std + settings.BASELINE_EWMA_ALPHA * std_val
            baseline.baseline_median = (1 - settings.BASELINE_EWMA_ALPHA) * baseline.baseline_median + settings.BASELINE_EWMA_ALPHA * median_val
            baseline.session_count = len(values)
        else:
            baseline = Baseline(
                user_id=user_id,
                metric_name=metric_name,
                baseline_mean=mean_val,
                baseline_std=std_val,
                baseline_median=median_val,
                session_count=len(values),
            )
            db.add(baseline)


def detect_anomalies(db: Session, session_id: str, user_id: str, session_analytics: List[Dict[str, Any]]) -> None:
    if len(session_analytics) < 2:
        return

    features = {}
    for a in session_analytics:
        features[f"{a['task_type']}_mean_rt"] = a["mean_rt"]
        features[f"{a['task_type']}_rt_cv"] = a["rt_cv"]
        features[f"{a['task_type']}_accuracy"] = a["accuracy"]
        if a.get("commission_errors") is not None:
            features["go_no_go_commission_rate"] = a["commission_errors"] / 80.0

    try:
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler

        all_sessions = db.query(SessionAnalytics).filter(SessionAnalytics.user_id == user_id).all()
        if len(all_sessions) < 5:
            return

        X = []
        for a in all_sessions:
            feat = {}
            for key, value in [
                ("mean_rt", a.mean_rt),
                ("rt_cv", a.rt_cv),
                ("accuracy", a.accuracy),
            ]:
                feat[f"{a.task_type}_{key}"] = value
            if a.commission_errors is not None:
                feat["go_no_go_commission_rate"] = a.commission_errors / 80.0
            X.append(feat)

        if len(X) < 5:
            return

        all_keys = set()
        for feat in X:
            all_keys.update(feat.keys())
        all_keys = sorted(all_keys)

        X_matrix = np.array([[feat.get(k, 0) for k in all_keys] for feat in X])

        if np.any(np.isnan(X_matrix)) or np.any(np.isinf(X_matrix)):
            return

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_matrix)

        clf = IsolationForest(contamination=settings.ANOMALY_CONTAMINATION, random_state=42)
        clf.fit(X_scaled)

        current_feat = np.array([[features.get(k, 0) for k in all_keys]])
        current_scaled = scaler.transform(current_feat)
        anomaly_score = float(-clf.score_samples(current_scaled)[0])
        is_anomaly = clf.predict(current_scaled)[0] == -1

        anomaly = AnomalyResult(
            session_id=session_id,
            user_id=user_id,
            anomaly_score=anomaly_score,
            is_anomaly=bool(is_anomaly),
            features=features,
        )
        db.add(anomaly)

    except Exception:
        pass


def generate_insights(db: Session, user_id: str, session_id: str, session_analytics: List[Dict[str, Any]]) -> None:
    baselines = db.query(Baseline).filter(Baseline.user_id == user_id).all()
    if len(baselines) < 3:
        return

    baseline_dict = {b.metric_name: b for b in baselines}

    for a in session_analytics:
        for key, value in [
            ("mean_rt", a["mean_rt"]),
            ("rt_cv", a["rt_cv"]),
            ("accuracy", a["accuracy"]),
        ]:
            metric_name = f"{a['task_type']}_{key}"
            if metric_name not in baseline_dict:
                continue

            b = baseline_dict[metric_name]
            if b.baseline_std == 0:
                continue

            z_score = (value - b.baseline_mean) / b.baseline_std

            if abs(z_score) > 2:
                direction = "slower" if z_score > 0 else "faster"
                metric_label = key.replace("_", " ")
                task_label = a['task_type'].replace("_", " ")

                if key == "accuracy":
                    direction = "worse" if z_score < 0 else "better"
                    metric_label = "accuracy"

                insight = Insight(
                    user_id=user_id,
                    insight_type="anomaly",
                    title=f"{task_label.title()} {metric_label} {direction}",
                    description=f"Your {task_label} {metric_label} was {abs(z_score):.1f} standard deviations from your baseline ({direction}).",
                    severity="warning" if z_score < 0 else "info",
                    metadata={"metric": metric_name, "z_score": z_score, "session_id": session_id},
                )
                db.add(insight)

    recent_sessions = db.query(SessionAnalytics).filter(SessionAnalytics.user_id == user_id).order_by(SessionAnalytics.computed_at.desc()).limit(5).all()
    if len(recent_sessions) >= 3:
        task_types = set(a.task_type for a in recent_sessions)
        for task_type in task_types:
            task_sessions = [a for a in recent_sessions if a.task_type == task_type]
            if len(task_sessions) >= 3:
                rts = [a.mean_rt for a in task_sessions]
                if len(rts) >= 3:
                    slope = np.polyfit(range(len(rts)), rts, 1)[0]
                    if abs(slope) > 5:
                        direction = "improving" if slope < 0 else "declining"
                        insight = Insight(
                            user_id=user_id,
                            insight_type="trend",
                            title=f"{task_type.replace('_', ' ').title()} reaction time {direction}",
                            description=f"Your {task_type.replace('_', ' ')} reaction time has been {direction} over the last {len(task_sessions)} sessions.",
                            severity="positive" if slope < 0 else "warning",
                            metadata={"task_type": task_type, "slope": float(slope)},
                        )
                        db.add(insight)