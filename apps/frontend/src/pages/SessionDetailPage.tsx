import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { PageLoader } from "../components/LoadingSpinner";
import { format } from "date-fns";

interface SessionDetail {
  session: {
    session_id: string;
    user_id: string;
    start_time: string;
    end_time: string | null;
    session_number: number;
    completion_rate: number | null;
    tasks_completed: string[];
    created_at: string;
  };
  analytics: Array<{
    task_type: string;
    mean_rt: number;
    median_rt: number;
    rt_std: number;
    rt_cv: number;
    accuracy: number;
    commission_errors?: number;
    omission_errors?: number;
    computed_at: string;
  }>;
  z_scores: Array<{
    metric_name: string;
    current_value: number;
    baseline_mean: number;
    baseline_std: number;
    z_score: number;
    computed_at: string;
  }>;
  anomalies: Array<{
    session_id: string;
    user_id: string;
    anomaly_score: number;
    is_anomaly: boolean;
    features: Record<string, number>;
    computed_at: string;
  }>;
  insights: Array<{
    user_id: string;
    insight_type: string;
    title: string;
    description: string;
    severity: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  }>;
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { userId } = useAuthStore();
  const [data, setData] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !userId) return;
    fetchSession();
  }, [sessionId, userId]);

  const fetchSession = async () => {
    try {
      const response = await api.get<SessionDetail>(`/sessions/${sessionId}`);
      setData(response.data);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to load session details");
      setIsLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Session Not Found</h2>
        <p className="text-neutral-600 mb-6">{error || "Unable to load session details"}</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const { session, analytics, z_scores, anomalies, insights } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="btn-ghost text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">Session #{session.session_number}</h1>
          <p className="text-neutral-500 mt-1">
            {format(new Date(session.start_time), "MMMM d, yyyy 'at' h:mm a")}
            {session.end_time && ` • ${format(new Date(session.start_time), "h:mm a")} - ${format(new Date(session.end_time), "h:mm a")}`}
          </p>
        </div>
        {anomalies[0]?.is_anomaly && (
          <div className="badge badge-red flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Anomalous Session
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-sm text-neutral-500 mb-1">Tasks Completed</h3>
          <p className="text-3xl font-bold text-neutral-900">{session.tasks_completed.length}/5</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm text-neutral-500 mb-1">Duration</h3>
          <p className="text-3xl font-bold text-neutral-900">
            {session.start_time && session.end_time
              ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)
              : "—"} min
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm text-neutral-500 mb-1">Completion Rate</h3>
          <p className="text-3xl font-bold text-neutral-900">
            {session.completion_rate ? `${Math.round(session.completion_rate * 100)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-neutral-900">Task Performance</h2>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-neutral-500 border-b border-neutral-200">
                  <th className="pb-3 font-medium">Task</th>
                  <th className="pb-3 font-medium text-right">Mean RT</th>
                  <th className="pb-3 font-medium text-right">Median RT</th>
                  <th className="pb-3 font-medium text-right">Variability (CV)</th>
                  <th className="pb-3 font-medium text-right">Accuracy</th>
                  <th className="pb-3 font-medium text-right">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {analytics.map((a) => (
                  <tr key={a.task_type} className="hover:bg-neutral-50">
                    <td className="py-4 font-medium text-neutral-900 capitalize">{a.task_type.replace(/_/g, " ")}</td>
                    <td className="py-4 text-right font-mono text-neutral-900">{a.mean_rt.toFixed(0)} ms</td>
                    <td className="py-4 text-right font-mono text-neutral-900">{a.median_rt.toFixed(0)} ms</td>
                    <td className="py-4 text-right font-mono text-neutral-900">{(a.rt_cv * 100).toFixed(1)}%</td>
                    <td className="py-4 text-right font-mono text-neutral-900">{(a.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-4 text-right text-neutral-600">
                      {a.commission_errors !== undefined && a.omission_errors !== undefined
                        ? `C: ${a.commission_errors} | O: ${a.omission_errors}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-neutral-900">Z-Scores vs Baseline</h2>
          </div>
          <div className="card-body">
            {z_scores.length === 0 ? (
              <p className="text-neutral-500 text-center py-8">Baseline requires 3+ sessions</p>
            ) : (
              <div className="space-y-4">
                {z_scores.map((z) => (
                  <ZScoreRow
                    key={z.metric_name}
                    metric_name={z.metric_name}
                    current_value={z.current_value}
                    baseline_mean={z.baseline_mean}
                    _baseline_std={z.baseline_std}
                    z_score={z.z_score}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-neutral-900">Anomaly Detection</h2>
          </div>
          <div className="card-body">
            {anomalies.length === 0 ? (
              <p className="text-neutral-500 text-center py-8">No anomaly data available</p>
            ) : (
              <div className="space-y-4">
                {anomalies.map((a) => (
                  <AnomalyRow key={a.session_id} anomaly={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-neutral-900">Insights</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {insights.map((i) => (
                <InsightCard key={i.created_at} insight={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ZScoreRow({ metric_name, current_value, baseline_mean, _baseline_std, z_score }: {
  metric_name: string;
  current_value: number;
  baseline_mean: number;
  _baseline_std: number;
  z_score: number;
}) {
  void _baseline_std;
  const absZ = Math.abs(z_score);
  const color = absZ < 1 ? "green" : absZ < 2 ? "yellow" : "red";
  const label = absZ < 1 ? "Normal" : absZ < 2 ? "Elevated" : "Significant";

  const formatValue = (name: string, val: number) => {
    if (name.includes("rt") || name.includes("reaction")) return `${val.toFixed(0)} ms`;
    if (name.includes("cv") || name.includes("variability")) return `${(val * 100).toFixed(1)}%`;
    if (name.includes("accuracy")) return `${(val * 100).toFixed(1)}%`;
    return val.toFixed(2);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
      <div>
        <p className="font-medium text-neutral-900 capitalize">{metric_name.replace(/_/g, " ")}</p>
        <p className="text-sm text-neutral-500">
          Current: {formatValue(metric_name, current_value)} • Baseline: {formatValue(metric_name, baseline_mean)}
        </p>
      </div>
      <div className="text-right">
        <span className={`badge badge-${color}`}>{label}</span>
        <p className="text-sm font-mono text-neutral-600 mt-1">z = {z_score >= 0 ? "+" : ""}{z_score.toFixed(2)}</p>
      </div>
    </div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: { is_anomaly: boolean; anomaly_score: number; features: Record<string, number> } }) {
  return (
    <div className={`p-3 rounded-lg ${anomaly.is_anomaly ? "bg-red-50 border border-red-100" : "bg-neutral-50"}`}>
      <div className="flex items-center justify-between">
        <span className={`font-medium ${anomaly.is_anomaly ? "text-red-700" : "text-green-700"}`}>
          {anomaly.is_anomaly ? "⚠ Anomalous Session" : "✓ Normal Session"}
        </span>
        <span className="text-sm font-mono text-neutral-500">Score: {anomaly.anomaly_score.toFixed(3)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-600">
        {Object.entries(anomaly.features).map(([k, v]) => (
          <span key={k} className="bg-white px-2 py-1 rounded border">
            {k}: {v.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: { insight_type: string; title: string; description: string; severity: string } }) {
  const severityColors = {
    info: "bg-blue-50 text-blue-700 border-blue-100",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-100",
    positive: "bg-green-50 text-green-700 border-green-100",
  };

  const icons = {
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    positive: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  };

  return (
    <div className={`p-4 rounded-lg border ${severityColors[insight.severity as keyof typeof severityColors] || severityColors.info}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icons[insight.severity as keyof typeof icons] || icons.info}</div>
        <div className="flex-1">
          <p className="font-medium">{insight.title}</p>
          <p className="text-sm mt-1">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}