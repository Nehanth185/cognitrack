# CogniTrack Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COGNITRACK SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    HTTPS/WS      ┌──────────────┐    SQL       ┌────────┐ │
│  │   Frontend   │ ◀──────────────▶ │   Backend    │ ◀──────────▶ │Postgres│ │
│  │   (React)    │                  │  (FastAPI)   │              │        │ │
│  └──────────────┘                  └──────────────┘              └────────┘ │
│         │                                 │                                  │
│         │                                 ▼                                  │
│         │                          ┌──────────────┐                          │
│         │                          │  Analytics   │                          │
│         │                          │  Pipeline    │                          │
│         │                          └──────────────┘                          │
│         │                                 │                                  │
│         └─────────────────────────────────┼──────────────────────────────────┘
│                                           │
│                    ┌──────────────────────┼──────────────────────┐
│                    ▼                      ▼                      ▼
│             ┌───────────┐           ┌───────────┐           ┌───────────┐
│             │  Baseline │           │  Anomaly    │           │ Insights  │
│             │  Engine   │           │  Detection  │           │  Engine   │
│             └───────────┘           └───────────┘           └───────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Session Creation
```
User clicks "Start Session"
       │
       ▼
POST /api/v1/sessions {user_id}
       │
       ▼
Creates Session row, returns session_id
       │
       ▼
Frontend loads TaskRunner with first task config
```

### 2. Task Execution (per task)
```
TaskRunner mounts
       │
       ▼
Shows instructions
       │
       ▼
User clicks "Start" → phase = "running"
       │
       ▼
For each trial:
  1. Random delay (500-3000ms)
  2. Stimulus appears (requestAnimationFrame)
  3. User responds (keydown)
  4. RT = performance.now() - stimulusStart
  5. Validate RT (150-3000ms)
  6. Record trial locally
  7. Inter-trial interval
  8. Repeat
       │
       ▼
All trials done → POST /api/v1/trials/batch
       │
       ▼
Backend validates, stores, computes analytics
```

### 3. Analytics Computation
```
Session complete
       │
       ▼
compute_session_analytics()
       │
       ├── Filter invalid RTs (<150ms, >3000ms)
       ├── Group by task_type
       ├── Compute per-task:
       │     mean_rt, median_rt, rt_std, rt_cv, accuracy
       │     commission_errors, omission_errors (Go/No-Go)
       │     flanker_effect, stroop_effect (when implemented)
       ├── Store in session_analytics
       │
       ▼
update_baselines(user_id, new_analytics)
       │
       ├── If sessions < 3: store as baseline
       ├── Else: EWMA update baseline_mean/std/median
       │     new = 0.9 × old + 0.1 × current
       │
       ▼
compute_z_scores(session_id, baselines)
       │
       ├── For each metric: z = (current - baseline_mean) / baseline_std
       │
       ▼
detect_anomalies(session_id, features)
       │
       ├── Isolation Forest on [mean_rt, accuracy, rt_cv, commission_rate]
       ├── Retrain weekly per user
       │
       ▼
generate_insights(user_id, session_id, z_scores, anomalies)
       │
       ├── Template-based NL insights
       │
       ▼
Store all → Return to frontend
```

## Database Schema

```
users
├── user_id (PK)
├── age_range
├── sex
├── created_at
└── last_active_at

sessions
├── session_id (PK)
├── user_id (FK)
├── start_time
├── end_time
├── session_number
├── completion_rate
├── tasks_completed (ARRAY)
└── created_at

trials
├── trial_id (PK)
├── session_id (FK)
├── user_id (FK)
├── task_type
├── stimulus
├── correct_response
├── user_response
├── reaction_time
├── accuracy
├── timestamp
├── trial_number
├── block_number
├── device_type
└── browser

session_analytics
├── id (PK)
├── session_id (FK)
├── user_id (FK)
├── task_type
├── mean_rt
├── median_rt
├── rt_std
├── rt_cv
├── accuracy
├── commission_errors
├── omission_errors
└── computed_at

baselines
├── id (PK)
├── user_id (FK)
├── metric_name
├── baseline_mean
├── baseline_std
├── baseline_median
├── session_count
└── updated_at

anomaly_results
├── id (PK)
├── session_id (FK)
├── user_id (FK)
├── anomaly_score
├── is_anomaly
├── features (JSONB)
└── computed_at

insights
├── id (PK)
├── user_id (FK)
├── insight_type
├── title
├── description
├── severity
├── metadata (JSONB)
└── created_at
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create anonymous user |
| GET | `/api/v1/auth/me` | Get current user |
| DELETE | `/api/v1/users/me` | Delete account |
| POST | `/api/v1/sessions` | Create new session |
| GET | `/api/v1/sessions/{id}` | Get session details |
| GET | `/api/v1/sessions/user/{user_id}` | List user sessions |
| PATCH | `/api/v1/sessions/{id}/complete` | Complete session, compute analytics |
| POST | `/api/v1/trials/batch` | Bulk insert trials |
| GET | `/api/v1/trials/session/{id}` | Get session trials |
| GET | `/api/v1/analytics/trends/{user_id}` | Get trend data for charts |
| GET | `/api/v1/analytics/baseline/{user_id}` | Get baselines + z-scores |
| GET | `/api/v1/export/csv/{user_id}` | Export all data as CSV |

## Frontend State Management

### Zustand Stores

**authStore** - User authentication
```typescript
{
  userId: string | null,
  isInitialized: boolean,
  register: () => Promise<void>,
  logout: () => void,
  initialize: () => Promise<void>
}
```

**sessionStore** - Current session state
```typescript
{
  sessionId: string | null,
  currentTaskIndex: number,
  trialBuffer: Trial[],
  flushTrialBuffer: () => Promise<void>
}
```

**analyticsStore** - Cached analytics data
```typescript
{
  trends: TrendSession[],
  baselines: Baseline[],
  insights: Insight[],
  fetchTrends: () => Promise<void>,
  fetchBaselines: () => Promise<void>
}
```

## Deployment Architecture

### Railway (Recommended)
```
GitHub → Railway → [PostgreSQL] + [Backend Service] + [Frontend Service]
                    │              │                    │
                    │              ▼                    ▼
                    │         uvicorn app.main:app   npm run dev
                    │         Port 8000              Port 5173
                    │              │                    │
                    └──────────────┴────────────────────┘
                                     │
                                     ▼
                              https://cognitrack.up.railway.app
```

### Environment Variables (Production)
```bash
DATABASE_URL=postgresql://...
SECRET_KEY=...
BACKEND_CORS_ORIGINS=["https://your-domain.com"]
BASELINE_MIN_SESSIONS=3
BASELINE_EWMA_ALPHA=0.1
```

## Scaling Considerations

### Current Limits (Free Tier)
- Railway: 500h/month, 1GB RAM, shared CPU
- PostgreSQL: 1GB storage
- Sufficient for ~1000 active users

### Horizontal Scaling Path
1. **Read replicas** for analytics queries
2. **Redis** for session caching, rate limiting
3. **Celery + Redis** for background analytics jobs
4. **TimescaleDB** for time-series trial data
5. **CDN** for frontend assets

## Security

- **CORS**: Restricted to known origins
- **Input validation**: Pydantic schemas on all endpoints
- **RT bounds**: Server-side validation (150-3000ms)
- **No auth tokens**: Anonymous UUID in localStorage only
- **HTTPS**: Enforced in production
- **Rate limiting**: Per-user trial batch limits (future)

## Monitoring

- **Health endpoint**: `/health` for load balancer
- **Structured logging**: JSON logs with correlation IDs
- **Error tracking**: Sentry (free tier)
- **Metrics**: Prometheus /metrics endpoint (future)