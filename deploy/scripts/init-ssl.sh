#!/bin/bash
# ============================================================================
# CRACKFLOW - SSL Certificate Initialization (Let's Encrypt)
# Usage: ./init-ssl.sh <domain> <email>
# ============================================================================

set -euo pipefail

if [ $# -lt 2 ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 crackflow.example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "${SCRIPT_DIR}")")"

echo "Initializing SSL certificates for ${DOMAIN}..."

# Create directories
mkdir -p "${PROJECT_ROOT}/deploy/certbot/conf"
mkdir -p "${PROJECT_ROOT}/deploy/certbot/www"

# Download recommended TLS parameters
if [ ! -f "${PROJECT_ROOT}/deploy/certbot/conf/options-ssl-nginx.conf" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
        > "${PROJECT_ROOT}/deploy/certbot/conf/options-ssl-nginx.conf"
fi

if [ ! -f "${PROJECT_ROOT}/deploy/certbot/conf/ssl-dhparams.pem" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
        > "${PROJECT_ROOT}/deploy/certbot/conf/ssl-dhparams.pem"
fi

# Create dummy certificate for initial nginx startup
CERT_PATH="${PROJECT_ROOT}/deploy/certbot/conf/live/${DOMAIN}"
mkdir -p "${CERT_PATH}"

if [ ! -f "${CERT_PATH}/privkey.pem" ]; then
    echo "Creating dummy certificate..."
    openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
        -keyout "${CERT_PATH}/privkey.pem" \
        -out "${CERT_PATH}/fullchain.pem" \
        -subj "/CN=localhost"
fi

# Start nginx with dummy cert
echo "Starting nginx..."
docker compose up -d nginx

# Delete dummy certificate
rm -rf "${CERT_PATH}"

# Request real certificate
echo "Requesting Let's Encrypt certificate..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}"

# Reload nginx with real certificate
echo "Reloading nginx..."
docker compose exec nginx nginx -s reload

echo "SSL certificate initialized successfully for ${DOMAIN}"
