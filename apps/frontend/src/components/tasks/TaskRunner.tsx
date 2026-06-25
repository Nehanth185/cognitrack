import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { TaskConfig, Trial, StimulusType, ResponseKey } from "@cognitrack/shared";
import { useKeyboard } from "../../hooks/useKeyboard";

interface TaskRunnerProps {
  config: TaskConfig;
  onComplete: (trials: Trial[]) => void;
}

export interface TaskRunnerRef {
  start: () => void;
}

export const TaskRunner = forwardRef<TaskRunnerRef, TaskRunnerProps>(({ config, onComplete }, ref) => {
  const [phase, setPhase] = useState<"instructions" | "running" | "complete">("instructions");
  const [currentTrial, setCurrentTrial] = useState(0);
  const [stimulus, setStimulus] = useState<StimulusState>({ type: "waiting", startTime: 0 });
  const [trials, setTrials] = useState<Trial[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const trialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stimulusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const responseRecordedRef = useRef(false);
  const stimulusStartRef = useRef<number>(0);
  const trialCountRef = useRef(0);

  const { lastKey, resetKey } = useKeyboard({ allowedKeys: config.response_keys });

  useImperativeHandle(ref, () => ({
    start: () => {
      setPhase("running");
      startNextTrial();
    },
  }));

  const startNextTrial = useCallback(() => {
    if (currentTrial >= config.trial_count) {
      finishTask();
      return;
    }

    if (isPaused) return;

    responseRecordedRef.current = false;
    resetKey();

    const trialNumber = trialCountRef.current + 1;
    trialCountRef.current = trialNumber;

    const delay = config.stimulus_timing.min_delay_ms +
      Math.random() * (config.stimulus_timing.max_delay_ms - config.stimulus_timing.min_delay_ms);

    trialTimeoutRef.current = setTimeout(() => {
      if (isPaused) return;

      const stimType = selectStimulus(config);
      const correctResponse = config.correct_responses[stimType];

      stimulusStartRef.current = performance.now();
      setStimulus({ type: stimType, startTime: stimulusStartRef.current });

      stimulusTimeoutRef.current = setTimeout(() => {
        if (!responseRecordedRef.current && phase === "running") {
          recordResponse(null, correctResponse, stimType, trialNumber);
        }
      }, config.stimulus_timing.stimulus_duration_ms);
    }, delay);
  }, [currentTrial, config, isPaused, phase, resetKey]);

  const selectStimulus = (config: TaskConfig): StimulusType => {
    const stimTypes = Object.keys(config.correct_responses) as StimulusType[];
    return stimTypes[Math.floor(Math.random() * stimTypes.length)];
  };

  const recordResponse = useCallback(
    (userResponse: ResponseKey | null, correctResponse: ResponseKey, stimType: StimulusType, trialNumber: number) => {
      if (responseRecordedRef.current) return;
      responseRecordedRef.current = true;

      if (stimulusTimeoutRef.current) {
        clearTimeout(stimulusTimeoutRef.current);
      }

      const reactionTime = userResponse ? performance.now() - stimulusStartRef.current : null;
      const isValidRT = reactionTime !== null && reactionTime >= 150 && reactionTime <= 3000;
      const accuracy = userResponse === correctResponse;
      const finalResponse = isValidRT ? userResponse : null;
      const finalAccuracy = isValidRT ? accuracy : null;
      const finalRT = isValidRT ? reactionTime : null;

      const trial: Trial = {
        trial_id: crypto.randomUUID(),
        session_id: "",
        task_type: config.task_type,
        stimulus: stimType,
        correct_response: correctResponse,
        user_response: finalResponse,
        reaction_time: finalRT,
        accuracy: finalAccuracy,
        timestamp: new Date().toISOString(),
        trial_number: trialNumber,
        block_number: 1,
      };

      setTrials((prev) => [...prev, trial]);
      setStimulus({ type: "waiting", startTime: 0 });

      itiTimeoutRef.current = setTimeout(() => {
        setCurrentTrial((prev) => prev + 1);
      }, config.stimulus_timing.inter_trial_interval_ms);
    },
    [config]
  );

  useEffect(() => {
    if (phase !== "running" || isPaused) return;

    if (lastKey && stimulus.type !== "waiting") {
      const correctResponse = config.correct_responses[stimulus.type];
      recordResponse(lastKey, correctResponse, stimulus.type, trialCountRef.current);
    }
  }, [lastKey, phase, isPaused, stimulus, config, recordResponse]);

  const finishTask = useCallback(() => {
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current);
    if (stimulusTimeoutRef.current) clearTimeout(stimulusTimeoutRef.current);
    if (itiTimeoutRef.current) clearTimeout(itiTimeoutRef.current);
    setPhase("complete");
    onComplete(trials);
  }, [onComplete, trials]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && phase === "running") {
      setIsPaused((prev) => !prev);
    }
  }, [phase]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (phase === "instructions") {
    return (
      <div className="card animate-in">
        <div className="card-body text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
            <BrainIcon className="w-10 h-10 text-primary-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">{config.name}</h2>
          <p className="text-neutral-600 mb-8 text-lg">{config.instructions}</p>

          <div className="bg-neutral-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-neutral-900 mb-4">Controls:</h3>
            <ul className="space-y-2 text-neutral-700">
              {config.response_keys.map((key: ResponseKey) => (
                <li key={key} className="flex items-center gap-3">
                  <kbd className="px-3 py-1.5 bg-white border border-neutral-200 rounded font-mono text-sm">
                    {key === "Space" ? "SPACE" : key === "ArrowLeft" ? "←" : key === "ArrowRight" ? "→" : key}
                  </kbd>
                  <span>{getKeyDescription(key, config)}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 text-neutral-500">
                <kbd className="px-3 py-1.5 bg-white border border-neutral-200 rounded font-mono text-sm">ESC</kbd>
                <span>Pause / Resume</span>
              </li>
            </ul>
          </div>

          <div className="text-sm text-neutral-500 mb-6">
            {config.trial_count} trials • ~{Math.round((config.trial_count * (config.stimulus_timing.min_delay_ms + config.stimulus_timing.max_delay_ms) / 2) / 1000)} seconds
          </div>

          <button
            onClick={() => setPhase("running")}
            className="btn-primary w-full py-3 text-lg"
            autoFocus
          >
            Start Task
          </button>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return null;
  }

  return (
    <div className="card animate-in">
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center animate-in">
            <h3 id="pause-title" className="text-xl font-bold text-neutral-900 mb-2">Paused</h3>
            <p className="text-neutral-600 mb-6">Press ESC to resume</p>
            <button onClick={() => setIsPaused(false)} className="btn-primary">
              Resume
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2" aria-label="Progress">
              {Array.from({ length: config.trial_count }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < currentTrial ? "bg-green-500" : i === currentTrial ? "bg-primary-500 animate-pulse" : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-neutral-500">
              Trial {Math.min(currentTrial + 1, config.trial_count)} / {config.trial_count}
            </span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold text-neutral-900">{currentTrial}/{config.trial_count}</p>
            <p className="text-xs text-neutral-500">Completed</p>
          </div>
        </div>

        <StimulusDisplay stimulus={stimulus} />

        <div className="mt-8 text-center text-sm text-neutral-500">
          {isPaused ? "Paused — Press ESC to resume" : "Focus on the screen above"}
        </div>
      </div>
    </div>
  );
});

function getKeyDescription(key: ResponseKey, config: TaskConfig): string {
  if (key === "Space") return config.task_type === "go_no_go" ? "Press for X (Go)" : "Press when green";
  if (key === "ArrowLeft") return "Press for ←";
  if (key === "ArrowRight") return "Press for →";
  if (key === "None") return "Do nothing for Y (No-Go)";
  return "";
}

interface StimulusState {
  type: StimulusType | "waiting";
  startTime: number;
}

interface StimulusDisplayProps {
  stimulus: StimulusState;
}

function StimulusDisplay({ stimulus }: StimulusDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stimulus.type !== "waiting" && containerRef.current) {
      containerRef.current.focus();
    }
  }, [stimulus.type]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`relative w-full aspect-video max-w-2xl mx-auto rounded-xl transition-all duration-200 ${
        stimulus.type === "green_screen" ? "bg-green-500" : "bg-neutral-200"
      }`}
      role="img"
      aria-label={getStimulusAriaLabel(stimulus.type)}
    >
      {stimulus.type === "left_arrow" && (
        <ArrowIcon direction="left" className="w-32 h-32 text-neutral-900" />
      )}
      {stimulus.type === "right_arrow" && (
        <ArrowIcon direction="right" className="w-32 h-32 text-neutral-900" />
      )}
      {stimulus.type === "letter_x" && (
        <LetterDisplay letter="X" className="text-9xl font-bold text-neutral-900" />
      )}
      {stimulus.type === "letter_y" && (
        <LetterDisplay letter="Y" className="text-9xl font-bold text-neutral-900" />
      )}
      {stimulus.type === "waiting" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-neutral-400 text-lg font-mono">Waiting...</div>
        </div>
      )}
    </div>
  );
}

function getStimulusAriaLabel(type: StimulusType | "waiting"): string {
  switch (type) {
    case "green_screen":
      return "Green screen — press space now";
    case "left_arrow":
      return "Left arrow — press left arrow";
    case "right_arrow":
      return "Right arrow — press right arrow";
    case "letter_x":
      return "Letter X — press space";
    case "letter_y":
      return "Letter Y — do not press";
    default:
      return "Waiting for stimulus";
  }
}

function ArrowIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full">
        {direction === "left" ? (
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
}

function LetterDisplay({ letter, className }: { letter: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <span>{letter}</span>
    </div>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M9 12a3 3 0 1 0 0 6H6a2 2 0 0 0-2 2v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5a2 2 0 0 0-2-2h-3a3 3 0 1 0 0-6Z" />
    </svg>
  );
}