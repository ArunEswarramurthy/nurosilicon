# Phase 14 - Deployment & Production Hardening

> This is a historical deployment summary, not evidence that the deployment topology has been exercised. The repository does not provision Judge0, HDL execution, or a verified database schema. Staging/production rollout remains blocked until external services and database history are validated.

## ✅ Completed Components

### 1. Dockerfiles (Multi-stage builds)
| File | Purpose | Features |
|------|---------|----------|
| `client/Dockerfile` | React SPA | 3-stage build, nginx, healthcheck |
| `server/Dockerfile` | Express API | 3-stage build, non-root user, healthcheck |
| External Judge0 service | Code execution | Must be provisioned independently and configured over HTTPS; not built or managed by this repository |

### 2. Docker Compose
| File | Environment | Services |
|------|-------------|----------|
| `docker-compose.yml` | Production | nginx, certbot, client, API, mysql, redis, backup; requires external Judge0 |
| `docker-compose.staging.yml` | Staging | Simplified setup with pre-built images; requires external Judge0 |

### 3. Environment Configuration
- `.env.production.example` - Template with vault placeholders
- `.gitignore` - Excludes secrets, backups, certbot configs
- Deployment API refuses host-process execution and requires an explicit HTTPS `JUDGE0_URL`.

### 4. Nginx Configuration
| Feature | Status |
|---------|--------|
| HTTPS/SSL (Let's Encrypt) | ✅ |
| Rate limiting (general/api/auth/upload) | ✅ |
| Gzip compression | ✅ |
| Security headers | ✅ |
| - HSTS | ✅ |
| - X-Frame-Options | ✅ |
| - X-Content-Type-Options | ✅ |
| - X-XSS-Protection | ✅ |
| - Content-Security-Policy | ✅ |
| - Permissions-Policy | ✅ |
| WebSocket proxy | ✅ |

### 5. Database Operations
| Script | Purpose |
|--------|---------|
| `deploy/scripts/backup.sh` | Automated daily backups with S3 upload |
| `deploy/scripts/restore.sh` | Database restore from backup |
| `deploy/scripts/backup-cron` | Cron schedule (2 AM daily) |
| `deploy/mysql/conf.d/custom.cnf` | MySQL performance tuning |
| `deploy/MIGRATION_RUNBOOK.md` | Zero-downtime migration guide |

### 6. CI/CD Pipeline (`.github/workflows/ci.yml`)
| Stage | Trigger | Actions |
|-------|---------|---------|
| Lint | All PRs | ESLint server + client |
| Test Server | After lint | Unit, Integration, Security tests |
| Test E2E | After lint | Playwright tests |
| Build | Main merge | Docker images to GHCR |
| Deploy Staging | After build | Auto-deploy only when the host `.env` confirms `DB_SCHEMA_VALIDATED=true` |
| Deploy Production | After staging | Manual approval and the same database-validation gate |

### 7. Monitoring & Health
| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Basic health check |
| `GET /api/health/detailed` | DB + Redis connectivity |
| `GET /api/ready` | Kubernetes readiness probe |
| `GET /api/live` | Kubernetes liveness probe |
| `GET /api/metrics` | Basic metrics |
| `GET /api/alerts` | Alert status |

### 8. Deployment Scripts
| Script | Purpose |
|--------|---------|
| `deploy/scripts/deploy-staging.sh` | One-command staging deploy |
| `deploy/scripts/init-ssl.sh` | Let's Encrypt SSL setup |
| `deploy/scripts/validate.sh` | Configuration validator |

### 9. Kubernetes (Optional)
- `deploy/k8s/deployment.yaml` - Basic K8s manifests

---

## Deployment

```bash
# Staging, only after reconciling schema and migration history:
DB_SCHEMA_VALIDATED=true ./deploy/scripts/deploy-staging.sh

# Production (after SSL setup)
./deploy/scripts/init-ssl.sh crackflow.example.com admin@example.com
docker compose up -d
```

## 🔒 Security Features

1. **Container Security**
   - Non-root users in all containers
   - Non-root API container
   - Host-process student-code execution disabled in deployment
   - External Judge0 isolation, configuration, and resource limits are operator responsibilities

2. **Network Security**
   - Rate limiting at nginx edge
   - TLS 1.2/1.3 only
   - Security headers on all responses

3. **Secrets Management**
   - Environment variables (not hardcoded)
   - `.env` files excluded from git
   - Vault placeholders in templates

## 📊 CI Pipeline Flow

```
PR Created
    ↓
[Lint] → Fail? → Block merge
    ↓
[Unit Tests] + [E2E Tests] → Fail? → Block merge
    ↓
Merge to main
    ↓
[Build Docker Images]
    ↓
[Deploy to Staging] (auto)
    ↓
[Deploy to Production] (manual approval)
```

## 📁 File Structure

```
deploy/
├── backups/           # Database backups
├── certbot/           # SSL certificates
├── k8s/               # Kubernetes manifests
├── mysql/
│   ├── conf.d/        # MySQL config
│   └── init/          # Init scripts
├── nginx/
│   ├── nginx.conf     # Production config
│   └── nginx.staging.conf
├── scripts/
│   ├── backup.sh
│   ├── backup-cron
│   ├── deploy-staging.sh
│   ├── init-ssl.sh
│   ├── restore.sh
│   └── validate.sh
├── MIGRATION_RUNBOOK.md
└── README.md
```

## ✅ Validation

Run the validator before deployment:
```bash
./deploy/scripts/validate.sh
```
