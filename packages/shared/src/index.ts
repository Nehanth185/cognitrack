export type TaskType =
  | "simple_reaction"
  | "choice_reaction"
  | "go_no_go";

export type StimulusType =
  | "green_screen"
  | "left_arrow"
  | "right_arrow"
  | "letter_x"
  | "letter_y";

export type ResponseKey = "Space" | "ArrowLeft" | "ArrowRight" | "None";

export interface Trial {
  trial_id: string;
  session_id: string;
  task_type: TaskType;
  stimulus: StimulusType;
  correct_response: ResponseKey;
  user_response: ResponseKey | null;
  reaction_time: number | null;
  accuracy: boolean | null;
  timestamp: string;
  trial_number: number;
  block_number: number;
}

export interface Session {
  session_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  session_number: number;
  completion_rate: number | null;
  tasks_completed: TaskType[];
  created_at: string;
}

export interface User {
  user_id: string;
  age_range: string | null;
  sex: string | null;
  created_at: string;
  last_active_at: string;
}

export interface SessionAnalytics {
  session_id: string;
  user_id: string;
  task_type: TaskType;
  mean_rt: number;
  median_rt: number;
  rt_std: number;
  rt_cv: number;
  accuracy: number;
  commission_errors?: number;
  omission_errors?: number;
  computed_at: string;
}

export interface Baseline {
  user_id: string;
  metric_name: string;
  baseline_mean: number;
  baseline_std: number;
  baseline_median: number;
  session_count: number;
  updated_at: string;
}

export interface ZScoreResult {
  session_id: string;
  user_id: string;
  metric_name: string;
  current_value: number;
  baseline_mean: number;
  baseline_std: number;
  z_score: number;
  computed_at: string;
}

export interface AnomalyResult {
  session_id: string;
  user_id: string;
  anomaly_score: number;
  is_anomaly: boolean;
  features: Record<string, number>;
  computed_at: string;
}

export interface Insight {
  user_id: string;
  insight_type: "trend" | "anomaly" | "baseline" | "streak";
  title: string;
  description: string;
  severity: "info" | "warning" | "positive";
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface AuthResponse {
  user_id: string;
  is_new: boolean;
}

export interface SessionCreateResponse {
  session_id: string;
  session_number: number;
}

export interface SessionSummary {
  session: Session;
  analytics: SessionAnalytics[];
  z_scores: ZScoreResult[];
  anomalies: AnomalyResult[];
  insights: Insight[];
}

export type TaskConfig = {
  task_type: TaskType;
  name: string;
  description: string;
  trial_count: number;
  block_count: number;
  instructions: string;
  stimulus_timing: {
    min_delay_ms: number;
    max_delay_ms: number;
    stimulus_duration_ms: number;
    inter_trial_interval_ms: number;
  };
  response_keys: ResponseKey[];
  correct_responses: Record<StimulusType, ResponseKey>;
};

export const TASK_CONFIGS: Record<TaskType, TaskConfig> = {
  simple_reaction: {
    task_type: "simple_reaction",
    name: "Simple Reaction Time",
    description: "Press spacebar when the screen turns green",
    trial_count: 30,
    block_count: 1,
    instructions: "Wait for the screen to turn green, then press SPACE as fast as you can.",
    stimulus_timing: {
      min_delay_ms: 500,
      max_delay_ms: 3000,
      stimulus_duration_ms: 1000,
      inter_trial_interval_ms: 1000,
    },
    response_keys: ["Space"],
    correct_responses: {
      green_screen: "Space",
    } as Record<StimulusType, ResponseKey>,
  },
  choice_reaction: {
    task_type: "choice_reaction",
    name: "Choice Reaction Time",
    description: "Press left arrow for left arrow, right arrow for right arrow",
    trial_count: 40,
    block_count: 1,
    instructions: "Press LEFT ARROW when you see ←, RIGHT ARROW when you see →.",
    stimulus_timing: {
      min_delay_ms: 500,
      max_delay_ms: 2000,
      stimulus_duration_ms: 2000,
      inter_trial_interval_ms: 800,
    },
    response_keys: ["ArrowLeft", "ArrowRight"],
    correct_responses: {
      left_arrow: "ArrowLeft",
      right_arrow: "ArrowRight",
    } as Record<StimulusType, ResponseKey>,
  },
  go_no_go: {
    task_type: "go_no_go",
    name: "Go/No-Go",
    description: "Press space for X, do nothing for Y",
    trial_count: 80,
    block_count: 1,
    instructions: "Press SPACE when you see X. Do NOT press anything when you see Y.",
    stimulus_timing: {
      min_delay_ms: 800,
      max_delay_ms: 1500,
      stimulus_duration_ms: 500,
      inter_trial_interval_ms: 1200,
    },
    response_keys: ["Space", "None"],
    correct_responses: {
      letter_x: "Space",
      letter_y: "None",
    } as Record<StimulusType, ResponseKey>,
  },
};

export const RT_VALID_MIN = 150;
export const RT_VALID_MAX = 3000;
export const MIN_SESSIONS_FOR_BASELINE = 3;
export const BASELINE_EWMA_ALPHA = 0.1;
export const ANOMALY_CONTAMINATION = 0.1;