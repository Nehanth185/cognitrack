import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { PageLoader } from "../components/LoadingSpinner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SessionTrend {
  session_id: string;
  session_number: number;
  start_time: string;
  mean_rt: number;
  median_rt: number;
  rt_cv: number;
  accuracy: number;
  z_scores: Record<string, number>;
}

export function TrendsPage() {
  const { userId } = useAuthStore();
  const [sessions, setSessions] = useState<SessionTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<"mean_rt" | "median_rt" | "rt_cv" | "accuracy">("mean_rt");

  useEffect(() => {
    if (!userId) return;
    fetchTrends();
  }, [userId]);

  const fetchTrends = async () => {
    try {
      const response = await api.get<{ sessions: SessionTrend[] }>(`/analytics/trends/${userId}`);
      setSessions(response.data.sessions);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to load trends data");
      setIsLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;

  const sortedSessions = [...sessions].sort((a, b) => a.session_number - b.session_number);

  const metricConfig = {
    mean_rt: { label: "Mean Reaction Time (ms)", color: "#0ea5e9", formatter: (v: number) => v.toFixed(0) },
    median_rt: { label: "Median Reaction Time (ms)", color: "#0284c7", formatter: (v: number) => v.toFixed(0) },
    rt_cv: { label: "Variability (CV %)", color: "#f59e0b", formatter: (v: number) => (v * 100).toFixed(1) },
    accuracy: { label: "Accuracy (%)", color: "#10b981", formatter: (v: number) => (v * 100).toFixed(1) },
  };

  const config = metricConfig[selectedMetric];
  const chartData = sortedSessions.map((s) => ({
    session: s.session_number,
    value: s[selectedMetric],
    date: new Date(s.start_time).toLocaleDateString(),
    zScore: s.z_scores[selectedMetric] || 0,
  }));

  const latestSession = sortedSessions[sortedSessions.length - 1];
  const latestZ = latestSession?.z_scores[selectedMetric] || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Performance Trends</h1>
          <p className="text-neutral-500 mt-1">Track your cognitive performance over time</p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Select metric">
          {Object.entries(metricConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as typeof selectedMetric)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === key
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
              role="tab"
              aria-selected={selectedMetric === key}
            >
              {cfg.label.split(" ")[0]} {cfg.label.split(" ")[1]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card border-red-200">
          <div className="card-body text-center text-red-600">{error}</div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">No Data Yet</h2>
          <p className="text-neutral-600 mb-6">Complete your first assessment session to see trends.</p>
          <a href="/assessment" className="btn-primary inline-block">Start Session</a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Sessions Completed"
              value={sessions.length}
              icon={<ChartIcon />}
            />
            <StatCard
              title="Latest Session"
              value={latestSession ? `#${latestSession.session_number}` : "—"}
              icon={<CalendarIcon />}
            />
            <StatCard
              title={`Current ${config.label.split(" ")[0]}`}
              value={config.formatter(latestSession?.[selectedMetric] || 0)}
              icon={<TargetIcon />}
            />
            <StatCard
              title="vs Baseline (z-score)"
              value={latestZ.toFixed(2)}
              icon={<ZScoreBadge zScore={latestZ} />}
            />
          </div>

          <div className="card">
            <div className="card-body">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis
                      dataKey="session"
                      tick={{ fontSize: 12, fill: "#737373" }}
                      axisLine={{ stroke: "#e5e5e5" }}
                      tickFormatter={(v) => `#${v}`}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#737373" }}
                      axisLine={false}
                      tickFormatter={config.formatter}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "white", border: "1px solid #e5e5e5", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      labelFormatter={(v) => `Session #${v}`}
                      formatter={(value: number) => [config.formatter(value), config.label]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={config.color}
                      strokeWidth={3}
                      dot={{ r: 6, strokeWidth: 3, stroke: config.color, fill: "white" }}
                      activeDot={{ r: 8, strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {sortedSessions.slice(-5).reverse().map((s) => (
                  <SessionBadge
                    key={s.session_id}
                    sessionNumber={s.session_number}
                    value={config.formatter(s[selectedMetric])}
                    zScore={s.z_scores[selectedMetric] || 0}
                    date={new Date(s.start_time).toLocaleDateString()}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="stat-card">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm text-neutral-500">{title}</p>
          <p className="stat-value">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SessionBadge({ sessionNumber, value, zScore, date }: { sessionNumber: number; value: string; zScore: number; date: string }) {
  const zColor = Math.abs(zScore) < 1 ? "green" : Math.abs(zScore) < 2 ? "yellow" : "red";
  return (
    <div className="card p-3 min-w-[140px]">
      <p className="text-xs text-neutral-500">Session #{sessionNumber}</p>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{date}</p>
      <span className={`badge badge-${zColor} mt-1`}>
        z = {zScore.toFixed(2)}
      </span>
    </div>
  );
}

function ZScoreBadge({ zScore }: { zScore: number }) {
  const color = Math.abs(zScore) < 1 ? "green" : Math.abs(zScore) < 2 ? "yellow" : "red";
  return (
    <span className={`badge badge-${color}`}>
      {zScore >= 0 ? "+" : ""}{zScore.toFixed(2)}
    </span>
  );
}

function ChartIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function CalendarIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TargetIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}