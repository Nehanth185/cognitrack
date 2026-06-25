# Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Easiest - All-in-One)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

1. Fork this repo
2. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub
3. Select your fork
4. Add PostgreSQL plugin
5. Set environment variables (see below)
6. Deploy!

**Railway will auto-detect:**
- Backend: Python/FastAPI from `apps/backend`
- Frontend: Node/React from `apps/frontend`
- Database: PostgreSQL plugin

### Option 2: Fly.io + Neon + Vercel

**Backend (Fly.io):**
```bash
cd apps/backend
fly launch --name cognitrack-api
fly secrets set DATABASE_URL="postgresql://..." SECRET_KEY="..."
fly deploy
```

**Database (Neon):**
1. Create project at [Neon](https://neon.tech)
2. Copy connection string
3. Run migrations: `fly ssh console -C "alembic upgrade head"`

**Frontend (Vercel):**
```bash
cd apps/frontend
vercel --prod
```
Set `VITE_API_BASE=https://your-fly-app.fly.dev/api/v1`

### Option 3: Docker Compose (VPS)

```bash
# On your server
git clone https://github.com/yourusername/cognitrack.git
cd cognitrack
cp .env.example .env  # Edit with your values
docker compose -f docker-compose.prod.yml up -d
```

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: cognitrack
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: cognitrack
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build: ./apps/backend
    environment:
      DATABASE_URL: postgresql://cognitrack:${DB_PASSWORD}@postgres:5432/cognitrack
      SECRET_KEY: ${SECRET_KEY}
      BACKEND_CORS_ORIGINS: '["https://yourdomain.com"]'
    restart: unless-stopped
    depends_on:
      - postgres

  frontend:
    build: ./apps/frontend
    environment:
      VITE_API_BASE: https://yourdomain.com/api/v1
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-32-char-secret-key
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
BASELINE_MIN_SESSIONS=3
BASELINE_EWMA_ALPHA=0.1
RT_VALID_MIN=150
RT_VALID_MAX=3000
```

### Frontend (.env)
```bash
VITE_API_BASE=https://yourdomain.com/api/v1
```

## Database Migrations

```bash
# Local
cd apps/backend
alembic upgrade head

# Production (Railway/Fly)
fly ssh console -C "alembic upgrade head"
# or
railway run alembic upgrade head
```

## SSL/TLS

### Railway/Fly.io/Vercel
Automatic - provided by platform

### Custom Domain + Nginx
```nginx
# nginx.conf
events { worker_connections 1024; }

http {
    upstream backend { server backend:8000; }
    upstream frontend { server frontend:5173; }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push:
1. Lint & typecheck (frontend + backend)
2. Tests (frontend + backend)
3. Database migrations
4. Docker builds (on main branch)

### Required Secrets (GitHub Settings → Secrets)
```
RAILWAY_TOKEN=your-railway-token
FLY_API_TOKEN=your-fly-token
VERCEL_TOKEN=your-vercel-token
```

## Monitoring

### Health Checks
- Backend: `GET /health`
- Frontend: `GET /` (200 OK)

### Logging
Structured JSON logs to stdout. Add log aggregation:
- **Railway**: Built-in log viewer
- **Fly.io**: `fly logs`
- **Self-hosted**: Loki + Grafana or Datadog

### Error Tracking (Sentry)
```python
# apps/backend/app/main.py
import sentry_sdk
sentry_sdk.init(dsn="...", traces_sample_rate=0.1)
```

## Backup Strategy

### PostgreSQL
```bash
# Daily backup (cron)
pg_dump -h host -U user db > backup_$(date +%F).sql

# Restore
psql -h host -U user db < backup_2024-01-15.sql
```

### Automated (Neon/Railway)
Point-in-time recovery built-in (7-30 days retention)

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Check `BACKEND_CORS_ORIGINS` includes frontend URL |
| DB connection failed | Verify `DATABASE_URL`, check security groups |
| Migrations fail | Run `alembic upgrade head` manually, check logs |
| Frontend blank | Check `VITE_API_BASE`, browser console for errors |
| WebSocket fails | Ensure proxy passes `Upgrade` header |

### Debug Commands
```bash
# Check backend logs
docker logs cognitrack-backend -f

# Check database
docker exec -it cognitrack-postgres psql -U cognitrack -d cognitrack

# Test API
curl https://yourdomain.com/api/v1/health
```

## Rollback

```bash
# Railway
railway rollback

# Fly.io
fly releases list
fly deploy --image <previous-image>

# Docker Compose
docker compose pull  # Get previous images
docker compose up -d
```

## Cost Estimates (Monthly)

| Platform | Free Tier | Paid Estimate |
|----------|-----------|---------------|
| Railway | 500h, 1GB RAM | $5-20/mo |
| Fly.io | 3 VMs, 160GB BW | $5-15/mo |
| Neon | 0.5GB PG | Free - $19/mo |
| Vercel | Unlimited personal | Free - $20/mo |
| **Total** | **$0** | **$10-50/mo** |