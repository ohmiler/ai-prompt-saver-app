#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/ai-prompt-saver-app"
REPO_URL="https://github.com/ohmiler/ai-prompt-saver-app.git"
DOMAIN="milerdev.tech"
WWW_DOMAIN="www.milerdev.tech"
PM2_NAME="ai-prompt-saver"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root from the VPS terminal." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing system packages"
apt update
apt install -y curl git nginx ufw certbot python3-certbot-nginx ca-certificates

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v(20|21|22|23|24)\.'; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi

echo "==> Installing PM2"
npm install -g pm2

echo "==> Fetching application"
mkdir -p /var/www
if [ ! -d "$APP_DIR/.git" ]; then
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only origin master
fi

cd "$APP_DIR"

cat > .env <<'ENV'
DATABASE_URL="file:./prod.db"
AUTH_COOKIE_NAME="prompt_saver_session"
ENV

if [ -f prisma/prod.db ]; then
  echo "==> Backing up existing SQLite database"
  cp prisma/prod.db "prisma/prod.db.backup-$(date +%Y%m%d-%H%M%S)"
fi

echo "==> Installing app dependencies"
npm ci

echo "==> Preparing database"
npm run db:generate
npm run db:push

echo "==> Building app"
npm run build

echo "==> Starting app with PM2"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start npm --name "$PM2_NAME" -- run start -- -H 127.0.0.1 -p 3000
fi

pm2 startup systemd -u root --hp /root >/dev/null || true
pm2 save

echo "==> Configuring Nginx"
cat > /etc/nginx/sites-available/ai-prompt-saver <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/ai-prompt-saver /etc/nginx/sites-enabled/ai-prompt-saver
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Configuring firewall"
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

echo "==> Requesting HTTPS certificate"
certbot --nginx \
  -d "$DOMAIN" \
  -d "$WWW_DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "admin@$DOMAIN" \
  --redirect

echo "==> Checking service"
curl -I http://127.0.0.1:3000 || true
curl -I "https://$DOMAIN" || true
pm2 status

echo "DEPLOY COMPLETE: https://$DOMAIN"
