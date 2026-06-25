import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { TaskRunner, type TaskRunnerRef } from "../components/tasks/TaskRunner";
import { PageLoader } from "../components/LoadingSpinner";
import { TASK_CONFIGS, TaskType } from "@cognitrack/shared";

const TASK_SEQUENCE: TaskType[] = ["simple_reaction", "choice_reaction", "go_no_go"];

export function AssessmentPage() {
  const { userId } = useAuthStore();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SessionResults | null>(null);
  const taskRunnerRef = useRef<TaskRunnerRef>(null);

  interface SessionResults {
    session_id: string;
    analytics: Array<{
      task_type: TaskType;
      mean_rt: number;
      median_rt: number;
      rt_std: number;
      rt_cv: number;
      accuracy: number;
      commission_errors?: number;
      omission_errors?: number;
    }>;
    z_scores: Array<{
      metric_name: string;
      z_score: number;
    }>;
  }

  

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    initializeSession();
  }, [userId, navigate]);

  const initializeSession = async () => {
    try {
      const response = await api.post<{ session_id: string; session_number: number }>("/sessions", {
        user_id: userId,
      });
      setSessionId(response.data.session_id);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to create session. Please try again.");
      setIsLoading(false);
    }
  };

  const handleTaskComplete = useCallback(async (_taskType: TaskType, trialData: unknown[]) => {
    if (!sessionId) return;

    try {
      await api.post("/trials/batch", {
        session_id: sessionId,
        trials: trialData,
      });

      if (currentTaskIndex < TASK_SEQUENCE.length - 1) {
        setCurrentTaskIndex((prev) => prev + 1);
      } else {
        await completeSession();
      }
    } catch (err) {
      setError("Failed to save trial data. Please try again.");
    }
  }, [sessionId, currentTaskIndex]);

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      const response = await api.patch<SessionResults>(`/sessions/${sessionId}/complete`, {});
      setResults(response.data);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to complete session.");
      setIsLoading(false);
    }
  };

  const handleViewResults = () => {
    if (sessionId) {
      navigate(`/session/${sessionId}`);
    }
  };

  const handleNewSession = () => {
    navigate("/assessment");
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Something went wrong</h2>
        <p className="text-neutral-600 mb-6">{error}</p>
        <button onClick={initializeSession} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (results) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 animate-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Session Complete!</h1>
        <p className="text-neutral-600 mb-8">Great work. Your data has been saved and analyzed.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {results.analytics.map((a) => (
            <div key={a.task_type} className="card p-4">
              <p className="text-sm text-neutral-500 capitalize">{a.task_type.replace(/_/g, " ")}</p>
              <p className="text-2xl font-bold text-neutral-900">{a.mean_rt.toFixed(0)} ms</p>
              <p className="text-sm text-neutral-500">{a.accuracy * 100}% accuracy</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={handleViewResults} className="btn-primary">
            View Detailed Results
          </button>
          <button onClick={handleNewSession} className="btn-secondary">
            Start Another Session
          </button>
        </div>
      </div>
    );
  }

  const currentTaskType = TASK_SEQUENCE[currentTaskIndex];
  const config = TASK_CONFIGS[currentTaskType];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">Task {currentTaskIndex + 1} of {TASK_SEQUENCE.length}</p>
          <h1 className="text-2xl font-bold text-neutral-900">{config.name}</h1>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm text-neutral-500">
          {TASK_SEQUENCE.map((t, i) => (
            <span
              key={t}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                i < currentTaskIndex
                  ? "bg-green-100 text-green-700"
                  : i === currentTaskIndex
                  ? "bg-primary-100 text-primary-700"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {TASK_CONFIGS[t].name}
            </span>
          ))}
        </div>
      </div>

      <TaskRunner
        ref={taskRunnerRef}
        config={config}
        onComplete={(trialData) => handleTaskComplete(currentTaskType, trialData)}
      />
    </div>
  );
}