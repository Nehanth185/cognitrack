# CogniTrack

**A longitudinal cognitive analytics platform that measures and models how an individual's attention, memory, and processing speed change over time using repeated behavioral tasks and personalized baseline comparisons.**

[![CI](https://github.com/yourusername/cognitrack/workflows/CI/badge.svg)](https://github.com/yourusername/cognitrack/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)

## 🎯 What is CogniTrack?

Cognitive tests are typically one-time snapshots heavily affected by mood, sleep, and practice effects. They compare you to population averages, not your personal history.

**CogniTrack solves: "How does this specific person change over time?"**

Instead of: "How does this person compare to others?"

### Key Features

- 🧠 **5 Cognitive Tasks**: Simple RT, Choice RT, Go/No-Go, Flanker, Stroop
- 📊 **Personal Baselines**: Your own baseline after 3 sessions, rolling updates (90/10 EWMA)
- 📈 **Longitudinal Tracking**: Z-scores vs your baseline, trend detection, anomaly detection
- 🔒 **Privacy-First**: Anonymous UUID only, no personal data, full data export/deletion
- 🔬 **Research-Grade**: Trial-level data, CSV export, isolation forest anomaly detection
- 🌐 **Web-Based**: Runs in browser, deploys anywhere (Railway, Fly.io, Vercel)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### One-Command Deploy (Docker)

```bash
git clone https://github.com/yourusername/cognitrack.git
cd cognitrack
docker compose up -d
```

Frontend: http://localhost:5173
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs

### Local Development

**Backend:**
```bash
cd apps/backend
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # Edit DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd apps/frontend
pnpm install
pnpm dev
```

## 🏗 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  PostgreSQL │
│  (React)    │     │  (FastAPI)  │     │  (Timescale)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Analytics  │
                    │  Pipeline   │
                    └─────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic 2, Alembic |
| Database | PostgreSQL 15 |
| Analytics | NumPy, Pandas, scikit-learn |
| Deployment | Docker, Railway/Fly.io/Vercel |

## 🧪 Cognitive Tasks

| Task | Measures | Trials | Duration |
|------|----------|--------|----------|
| **Simple Reaction Time** | Processing speed, attention lapses, variability | 30 | ~3 min |
| **Choice Reaction Time** | Decision speed, accuracy | 40 | ~4 min |
| **Go/No-Go** | Impulse control, commission/omission errors | 80 | ~5 min |
| **Flanker** | Attentional control, interference resistance | 60 | ~4 min |
| **Stroop** | Inhibition control, cognitive interference | 60 | ~4 min |

## 📊 Analytics Pipeline

```
Raw Trials → Data Cleaning → Feature Engineering → Baseline → Z-Scores → Trends → Insights
                │                  │                    │          │         │
                ▼                  ▼                    ▼          ▼         ▼
           RT 150-3000ms    Mean/Median/CV      EWMA 90/10   Standard    Isolation
           Accuracy >60%    Flanker/Stroop       rolling       dev.      Forest
                             Go/No-Go errors                     Anomaly
```

### Baseline System (Core Innovation)

1. **Phase 1** (Sessions 1-3): Collect data, no comparison
2. **Phase 2** (Session 4+): Compute baseline mean/std/median per metric
3. **Phase 3** (Ongoing): Rolling update `new = 0.9×old + 0.1×current`
4. **Comparison**: Z-score = (current - baseline_mean) / baseline_std

## 🔧 Configuration

### Environment Variables

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-secret-key
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
BASELINE_MIN_SESSIONS=3
BASELINE_EWMA_ALPHA=0.1
RT_VALID_MIN=150
RT_VALID_MAX=3000
```

## 📁 Project Structure

```
cognitrack/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── store/         # Zustand state management
│   │   │   ├── services/      # API client
│   │   │   ├── components/tasks/  # Cognitive task implementations
│   │   │   └── utils/         # Helpers
│   │   └── package.json
│   └── backend/           # FastAPI + Python
│       ├── app/
│       │   ├── api/           # API routes
│       │   ├── core/          # Config, database
│       │   ├── models/        # SQLAlchemy models
│       │   ├── schemas/       # Pydantic schemas
│       │   ├── services/      # Business logic
│       │   └── analytics/     # Analytics pipeline
│       ├── alembic/           # DB migrations
│       └── pyproject.toml
├── packages/
│   └── shared/            # Shared TypeScript types
├── docker-compose.yml
├── .github/workflows/     # CI/CD
└── README.md
```

## 🧪 Testing

```bash
# Frontend tests
cd apps/frontend && pnpm test

# Backend tests
cd apps/backend && pytest -v
```

## 📦 Deployment

### Railway (Recommended - All-in-One)

1. Connect GitHub repo to Railway
2. Add PostgreSQL plugin
3. Set environment variables
4. Deploy - automatic builds on push

### Fly.io + Neon + Vercel

```bash
# Backend
fly launch --name cognitrack-api
fly secrets set DATABASE_URL=... SECRET_KEY=...
fly deploy

# Frontend
vercel --prod
```

## 🔬 Research Mode

CogniTrack is designed for research use:

- **Trial-level data export**: Every click, RT, accuracy
- **Anonymized cohorts**: Group-level analysis without PII
- **Experiment framework**: A/B task parameters, custom conditions
- **Statistical rigor**: Isolation Forest, CUSUM, EWMA built-in

Example research questions:
- How stable are cognitive metrics over repeated testing in real-world conditions?
- Do practice effects differ by task type?
- Can anomaly detection flag meaningful cognitive changes?

## 🛡 Privacy & Ethics

- **No PII**: Anonymous UUID only, optional age range/sex
- **Local-first**: Data stored in your browser + server
- **User control**: One-click export, permanent deletion
- **Not medical**: Not a diagnostic tool, not FDA-cleared
- **Transparent**: Open source, auditable code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Cognitive task paradigms from classic psychology literature
- Built for the NASA Stardance Challenge
- Inspired by quantified-self and personal analytics communities

---

**CogniTrack v0.1.0** — Built with ❤️ for cognitive self-knowledge