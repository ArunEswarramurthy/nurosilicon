# CrackFlow Deployment Guide

## Staging Deployment

First reconcile the target database schema and applied migrations against a sanitized snapshot. Only after that review, record `DB_SCHEMA_VALIDATED=true` in the deployment host's `.env` file, then run:

```bash
# Staging deployment
DB_SCHEMA_VALIDATED=true ./deploy/scripts/deploy-staging.sh
```

## Prerequisites

- Docker 24+ & Docker Compose v2
- Node.js 20+ (for local development)
- Domain with DNS configured (for production)

## Environment Setup

1. Copy environment template:
```bash
cp .env.production.example .env
```

2. Configure secrets (use secret manager in production):
```
DB_PASSWORD=<secure-password>
JWT_SECRET=<random-256-bit-key>
MYSQL_ROOT_PASSWORD=<secure-password>
JUDGE0_URL=https://<isolated-judge-service>
```

Use a dedicated least-privilege value for `DB_USER`; do not use `root`. The API refuses deployment startup unless `SANDBOX_MODE=judge0` and a real HTTPS `JUDGE0_URL` are configured. The Judge0 service is external and must be provisioned and independently hardened; Compose does not provide a sandbox worker. HDL simulation is unavailable in deployment until a separately isolated HDL executor is implemented.

## Deployment Options

### Disposable Local Environment

For a disposable local database only; this bypasses the staging database-validation guard and must not be used to deploy staging or production:

```bash
docker compose -f docker-compose.staging.yml up -d
```

For staging, use the guarded deployment script above after reconciling the database schema and migration history.

### Production with SSL
```bash
# Initialize SSL certificates
./deploy/scripts/init-ssl.sh crackflow.example.com admin@example.com

# Deploy
docker compose up -d
```

Production deployment is not gated by this staging script; the CI deployment job also requires `DB_SCHEMA_VALIDATED=true` in the production host's `.env`.

## CI/CD Pipeline

- **PR**: Runs lint + unit + integration + e2e tests
- **Merge to main**: Auto-deploys to staging
- **Production**: Manual approval required

### GitHub Secrets Required
- `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`
- `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`
- `STAGING_URL`, `PROD_URL`
- `SLACK_WEBHOOK` (optional)

## Database Operations

The checked-in migration history is incomplete relative to the application models. Before staging deployment, reconcile the target schema and applied migration list against a sanitized schema snapshot, and set `DB_SCHEMA_VALIDATED=true` only after that review. The staging script will refuse to deploy without this acknowledgement. Set `APPLY_MIGRATIONS=true` only when the reviewed migration set is appropriate for that target; migrations run before the API is started.

```bash
# Backup
./deploy/scripts/backup.sh

# Restore
./deploy/scripts/restore.sh /backups/crackflow_YYYYMMDD.sql.gz

# Migrations
docker compose run --rm server npm run db:migrate
```

Review the migration list against the target schema and a verified backup before applying it. The checked-in migrations are not yet a complete schema history, so do not run them against an existing production database without a schema reconciliation plan.

## Monitoring

- Health: `GET /api/health`
- Detailed: `GET /api/health/detailed`
- Metrics: `GET /api/metrics`
- Alerts: `GET /api/alerts`

## Security Features

- Rate limiting (Nginx edge + Express)
- Security headers (CSP, HSTS, X-Frame-Options)
- Non-root containers
- Remote Judge0 execution configured at deployment; local host-process execution is blocked in staging/production
- Secrets via environment variables

## Troubleshooting

```bash
# View logs
docker compose logs -f server

# Check health
curl http://localhost/api/health/detailed

# Restart service
docker compose restart server
```
