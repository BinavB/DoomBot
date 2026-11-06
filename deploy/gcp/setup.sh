#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN:?Set DOMAIN, for example DOMAIN=doombot.duckdns.org}"
: "${REPO_URL:=https://github.com/BinavB/DoomBot.git}"

app_user=doombot
app_dir=/opt/doombot
data_dir=/var/lib/doombot

apt-get update
apt-get install -y ca-certificates curl gnupg git debian-keyring debian-archive-keyring apt-transport-https

if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

id -u "$app_user" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$app_user"
mkdir -p "$data_dir/notes"
chown -R "$app_user:$app_user" "$data_dir"

if [ ! -d "$app_dir/.git" ]; then
  git clone "$REPO_URL" "$app_dir"
fi
chown -R "$app_user:$app_user" "$app_dir"

sudo -u "$app_user" bash -c "cd $app_dir && npm ci && npm run build"

install -m 644 "$app_dir/deploy/gcp/doombot.service" /etc/systemd/system/doombot.service

printf '%s {\n    encode gzip\n    reverse_proxy 127.0.0.1:3000\n}\n' "$DOMAIN" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable caddy doombot
systemctl restart caddy

if [ ! -f /etc/doombot.env ]; then
  install -m 600 /dev/null /etc/doombot.env
  echo "Created /etc/doombot.env. Add your settings to it, then run: sudo systemctl restart doombot"
fi

echo "Setup finished. Fill in /etc/doombot.env, then run: sudo systemctl restart doombot"
