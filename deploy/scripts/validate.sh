#!/bin/bash
# ============================================================================
# CRACKFLOW - Deployment Configuration Validator
# Validates all deployment files before deployment
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0

check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "=========================================="
echo "CrackFlow Deployment Validator"
echo "=========================================="

# Check required files exist
echo -e "\n[1] Checking required files..."
[ -f "docker-compose.yml" ]; check $? "docker-compose.yml exists"
[ -f "docker-compose.staging.yml" ]; check $? "docker-compose.staging.yml exists"
[ -f "client/Dockerfile" ]; check $? "client/Dockerfile exists"
[ -f "server/Dockerfile" ]; check $? "server/Dockerfile exists"
[ -f "deploy/nginx/nginx.conf" ]; check $? "nginx.conf exists"
[ -f "deploy/scripts/backup.sh" ]; check $? "backup.sh exists"
[ -f "deploy/scripts/deploy-staging.sh" ]; check $? "deploy-staging.sh exists"
[ -f ".github/workflows/ci.yml" ]; check $? "CI workflow exists"

# Check scripts are executable (on Unix)
echo -e "\n[2] Checking script permissions..."
if [ "$(uname)" != "MINGW"* ]; then
    [ -x "deploy/scripts/backup.sh" ] || chmod +x deploy/scripts/backup.sh
    [ -x "deploy/scripts/deploy-staging.sh" ] || chmod +x deploy/scripts/deploy-staging.sh
    [ -x "deploy/scripts/restore.sh" ] || chmod +x deploy/scripts/restore.sh
    [ -x "deploy/scripts/init-ssl.sh" ] || chmod +x deploy/scripts/init-ssl.sh
fi
check 0 "Scripts permissions set"

# Validate YAML syntax
echo -e "\n[3] Validating YAML syntax..."
if command -v python3 &> /dev/null; then
    python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))" 2>/dev/null
    check $? "docker-compose.yml valid YAML"
    python3 -c "import yaml; yaml.safe_load(open('docker-compose.staging.yml'))" 2>/dev/null
    check $? "docker-compose.staging.yml valid YAML"
    python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>/dev/null
    check $? "ci.yml valid YAML"
else
    echo "  (skipped - python3 not available)"
fi

# Check environment template
echo -e "\n[4] Checking environment configuration..."
[ -f ".env.production.example" ]; check $? ".env.production.example exists"
grep -q "DB_PASSWORD" .env.production.example 2>/dev/null; check $? "DB_PASSWORD in env template"
grep -q "JWT_SECRET" .env.production.example 2>/dev/null; check $? "JWT_SECRET in env template"
grep -q "JUDGE0_URL" .env.production.example 2>/dev/null; check $? "JUDGE0_URL in env template"

# Check nginx config syntax
echo -e "\n[5] Checking nginx configuration..."
grep -q "rate_limit" deploy/nginx/nginx.conf 2>/dev/null || grep -q "limit_req" deploy/nginx/nginx.conf 2>/dev/null
check $? "Rate limiting configured"
grep -q "X-Frame-Options" deploy/nginx/nginx.conf 2>/dev/null; check $? "X-Frame-Options header"
grep -q "X-Content-Type-Options" deploy/nginx/nginx.conf 2>/dev/null; check $? "X-Content-Type-Options header"
grep -q "Strict-Transport-Security" deploy/nginx/nginx.conf 2>/dev/null; check $? "HSTS header"
grep -q "Content-Security-Policy" deploy/nginx/nginx.conf 2>/dev/null; check $? "CSP header"
grep -q "gzip on" deploy/nginx/nginx.conf 2>/dev/null; check $? "Gzip enabled"

# Check Dockerfiles
echo -e "\n[6] Checking Dockerfiles..."
grep -q "HEALTHCHECK" client/Dockerfile 2>/dev/null; check $? "Client healthcheck defined"
grep -q "HEALTHCHECK" server/Dockerfile 2>/dev/null; check $? "Server healthcheck defined"
grep -q "USER" server/Dockerfile 2>/dev/null; check $? "Server runs as non-root"
grep -q "SANDBOX_MODE=judge0" docker-compose.yml 2>/dev/null; check $? "Production uses isolated Judge0 mode"
grep -q "JUDGE0_URL=" docker-compose.yml 2>/dev/null; check $? "Production requires an external Judge0 URL"
! grep -q "sandbox-worker\|Dockerfile.sandbox" docker-compose.yml docker-compose.staging.yml; check $? "No undeclared sandbox worker is advertised"

# Check CI/CD
echo -e "\n[7] Checking CI/CD configuration..."
grep -q "test:unit" .github/workflows/ci.yml 2>/dev/null; check $? "Unit tests in CI"
grep -q "test:integration" .github/workflows/ci.yml 2>/dev/null; check $? "Integration tests in CI"
grep -q "test:e2e\|playwright" .github/workflows/ci.yml 2>/dev/null; check $? "E2E tests in CI"
grep -q "environment: production" .github/workflows/ci.yml 2>/dev/null; check $? "Production approval gate"

# Summary
echo -e "\n=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$ERRORS check(s) failed${NC}"
    exit 1
fi
