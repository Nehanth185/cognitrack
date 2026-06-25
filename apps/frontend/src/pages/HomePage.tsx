import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { PageLoader } from "../components/LoadingSpinner";

export function HomePage() {
  const { userId, register, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <PageLoader />;
  }

  if (!userId) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-600" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="currentColor"/>
              <path d="M8 16L14 22L24 10" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Track Your Cognitive Performance</h1>
          <p className="text-lg text-neutral-600 mb-8">
            CogniTrack measures how your attention, memory, and processing speed change over time using repeated behavioral tasks and personalized baseline comparisons.
          </p>
          <button
            onClick={async () => {
              await register();
              window.location.href = "/assessment";
            }}
            className="btn-primary w-full py-3 text-lg"
            disabled={!isInitialized}
          >
            Start Your First Session
          </button>
          <p className="mt-6 text-sm text-neutral-500">
            Anonymous • No email required • Data stays yours
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Welcome back</h1>
          <p className="text-neutral-500 mt-1">Ready for today's assessment?</p>
        </div>
        <Link to="/assessment" className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start Session
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Sessions This Week"
          value={0 as string | number}
          subtitle="Goal: 4-5 sessions"
          icon={<CalendarIcon />}
        />
        <StatCard
          title="Current Streak"
          value="0 days"
          subtitle="Keep it going!"
          icon={<FireIcon />}
        />
        <StatCard
          title="Baseline Status"
          value="Building..."
          subtitle="Needs 3 sessions"
          icon={<TargetIcon />}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-neutral-900">How It Works</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard number={1} title="Perform Tasks" description="Complete 3 cognitive tasks measuring reaction time, decision speed and impulse control (10-15 min)" />
            <StepCard number={2} title="Build Baseline" description="After 3 sessions your personal baseline is established for each metric" />
            <StepCard number={3} title="Track Changes" description="See z-scores vs your baseline spot trends and detect anomalies over time" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-neutral-900">Tasks in This Session</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <TaskPreviewCard
              name="Simple Reaction Time"
              description="Press spacebar when screen turns green — measures processing speed and attention lapses"
              duration="~3 min"
              trials="30 trials"
            />
            <TaskPreviewCard
              name="Choice Reaction Time"
              description="Press left/right arrow matching the arrow shown — measures decision speed and accuracy"
              duration="~4 min"
              trials="40 trials"
            />
            <TaskPreviewCard
              name="Go/No-Go"
              description="Press space for X, withhold for Y — measures impulse control and error rates"
              duration="~5 min"
              trials="80 trials"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="stat-card">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm text-neutral-500">{title}</p>
          <p className="stat-value">{value}</p>
          <p className="stat-label">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="relative pl-12">
      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-lg">
        {number}
      </div>
      <h3 className="font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-neutral-600 text-sm">{description}</p>
    </div>
  );
}

function TaskPreviewCard({ name, description, duration, trials }: { name: string; description: string; duration: string; trials: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium text-neutral-900">{name}</h3>
        <p className="text-sm text-neutral-600 mt-0.5">{description}</p>
      </div>
      <div className="text-right text-sm text-neutral-500 ml-4">
        <p>{duration}</p>
        <p>{trials}</p>
      </div>
    </div>
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

function FireIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
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