#!/bin/bash
# ============================================================================
# CRACKFLOW - One-Command Staging Deployment
# Usage: ./deploy-staging.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "${SCRIPT_DIR}")")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "${PROJECT_ROOT}/.env" ]; then
        log_error ".env file not found. Copy .env.production.example to .env and configure"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Build images
build_images() {
    log_info "Building Docker images..."
    cd "${PROJECT_ROOT}"
    docker compose -f docker-compose.staging.yml build --no-cache
}

# Start services
start_services() {
    log_info "Starting services..."
    cd "${PROJECT_ROOT}"
    docker compose -f docker-compose.staging.yml up -d
}

# Wait for services
wait_for_services() {
    log_info "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl --fail --silent http://localhost:5000/api/health > /dev/null; then
            log_info "API health check passed"
            return 0
        fi
        log_info "Waiting... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    log_error "API failed to become healthy"
    docker compose -f docker-compose.staging.yml logs
    exit 1
}

# Run migrations only after explicit approval
run_migrations_if_approved() {
    if [ "${APPLY_MIGRATIONS:-false}" != "true" ]; then
        log_warn "Skipping DB migrations. Review schema/migration coverage and set APPLY_MIGRATIONS=true only for a verified disposable or approved target."
        return 0
    fi

    log_warn "Applying explicit Sequelize migrations to the configured staging database."
    cd "${PROJECT_ROOT}"
    docker compose -f docker-compose.staging.yml run --rm server npm run db:migrate
}

# Health check
health_check() {
    log_info "Running health checks..."
    
    local api_url="http://localhost:5000/api/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${api_url}" || echo "000")
    
    if [ "${response}" = "200" ]; then
        log_info "API health check passed"
    else
        log_error "API health check failed (HTTP ${response})"
        exit 1
    fi
}

# Main deployment
main() {
    log_info "=========================================="
    log_info "CRACKFLOW Staging Deployment"
    log_info "=========================================="

    if [ "${DB_SCHEMA_VALIDATED:-false}" != "true" ]; then
        log_error "Refusing deployment until the target DB schema and applied migrations have been reconciled and verified (set DB_SCHEMA_VALIDATED=true after review)."
        exit 1
    fi
    
    check_prerequisites
    build_images
    run_migrations_if_approved
    start_services
    wait_for_services
    health_check
    
    log_info "=========================================="
    log_info "Deployment completed successfully!"
    log_info "=========================================="
    log_info "Client: http://localhost"
    log_info "API: http://localhost/api"
    log_info ""
    log_info "View logs: docker compose -f docker-compose.staging.yml logs -f"
    log_info "Stop: docker compose -f docker-compose.staging.yml down"
}

main "$@"
