#!/usr/bin/env bash
set -euo pipefail

sudo -u doombot bash -c "cd /opt/doombot && git pull --ff-only && npm ci && npm run build"
systemctl restart doombot
