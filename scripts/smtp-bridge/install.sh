#!/usr/bin/env bash
# Install the SMTP→HTTPS bridge as a systemd service, wire it up to every
# Supabase Auth container so they use 127.0.0.1:1025 instead of trying to
# reach the outside world on port 587.
#
# Run once after copying this directory to /opt/gleeworld-smtp-bridge.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="/etc/gleeworld-smtp-bridge.env"

# ── 1. Env file (Resend key + accepted-from list) ─────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  RESEND_KEY=$(grep -h '^RESEND_API_KEY=' /etc/gleeworld-provision.env /opt/supabase/.env 2>/dev/null | head -1 | cut -d= -f2-)
  if [[ -z "$RESEND_KEY" || "$RESEND_KEY" == "" ]]; then
    echo "✗ Couldn't find a RESEND_API_KEY. Add one to $ENV_FILE manually:"
    echo "    RESEND_API_KEY=re_xxx"
    echo "    ACCEPTED_FROM_DOMAINS=gleeworld.org"
    exit 1
  fi
  cat > "$ENV_FILE" <<ENV
RESEND_API_KEY=$RESEND_KEY
ACCEPTED_FROM_DOMAINS=gleeworld.org
BIND_PORT=1025
ENV
  chmod 600 "$ENV_FILE"
  echo "▸ Wrote $ENV_FILE (resend key pulled from existing config)"
fi

# ── 2. Install deps ───────────────────────────────────────────────────────
echo "▸ npm install"
cd "$DIR"
npm install --omit=dev --no-audit --no-fund > /dev/null

# ── 3. systemd unit ───────────────────────────────────────────────────────
echo "▸ Writing systemd unit"
cat > /etc/systemd/system/gleeworld-smtp-bridge.service <<UNIT
[Unit]
Description=GleeWorld SMTP-to-HTTPS bridge (forwards mail to Resend)
After=network.target

[Service]
Type=simple
EnvironmentFile=$ENV_FILE
WorkingDirectory=$DIR
ExecStart=/usr/bin/node $DIR/server.js
Restart=on-failure
RestartSec=5
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable gleeworld-smtp-bridge.service
systemctl restart gleeworld-smtp-bridge.service
sleep 1
systemctl status gleeworld-smtp-bridge.service --no-pager -l | head -10

# ── 4. Point every Supabase stack's Auth at the bridge ────────────────────
echo "▸ Updating Supabase stacks to use 127.0.0.1:1025"
for STACK in /opt/supabase /opt/supabase-*; do
  [[ -d "$STACK" ]] || continue
  if [[ ! -f "$STACK/.env" ]]; then continue; fi
  echo "  → $STACK"
  # Empty SMTP_USER/PASS tells GoTrue not to attempt SMTP AUTH, so it's
  # willing to send plain over the local-network connection to the bridge.
  sed -i \
    -e "s|^SMTP_HOST=.*|SMTP_HOST=host.docker.internal|" \
    -e "s|^SMTP_PORT=.*|SMTP_PORT=1025|" \
    -e "s|^SMTP_USER=.*|SMTP_USER=|" \
    -e "s|^SMTP_PASS=.*|SMTP_PASS=|" \
    "$STACK/.env"

  PROJ=""
  if [[ "$STACK" != "/opt/supabase" ]]; then
    PROJ="-p ${STACK##*/supabase-}"
  fi
  (cd "$STACK" && docker compose $PROJ up -d --force-recreate auth > /dev/null 2>&1) || true
done

# Containers can't normally reach host.docker.internal on Linux. Add
# extra_hosts entries... actually simpler: tell each compose stack to map
# host.docker.internal to host-gateway. We do that by adding an override.
for STACK in /opt/supabase /opt/supabase-*; do
  [[ -d "$STACK" ]] || continue
  OVERRIDE="$STACK/docker-compose.smtp-bridge.yml"
  cat > "$OVERRIDE" <<YML
services:
  auth:
    extra_hosts:
      - "host.docker.internal:host-gateway"
YML
  # Append to COMPOSE_FILE chain so it's always applied
  if ! grep -q "docker-compose.smtp-bridge.yml" "$STACK/.env"; then
    sed -i "s|^COMPOSE_FILE=.*|&:docker-compose.smtp-bridge.yml|" "$STACK/.env" || \
      echo "COMPOSE_FILE=docker-compose.yml:docker-compose.smtp-bridge.yml" >> "$STACK/.env"
  fi
  PROJ=""
  if [[ "$STACK" != "/opt/supabase" ]]; then
    PROJ="-p ${STACK##*/supabase-}"
  fi
  (cd "$STACK" && docker compose $PROJ up -d --force-recreate auth > /dev/null 2>&1) || true
done

cat <<DONE

═══════════════════════════════════════════════════════════════════════════
  ✓ SMTP bridge installed

  Bridge:  127.0.0.1:1025  (systemctl status gleeworld-smtp-bridge)
  Logs:    journalctl -u gleeworld-smtp-bridge -f

  Every Supabase Auth container is now configured to relay through it.
  Send a password reset to verify — emails will appear in the bridge log
  and arrive in the recipient's inbox via Resend HTTPS.

═══════════════════════════════════════════════════════════════════════════
DONE
