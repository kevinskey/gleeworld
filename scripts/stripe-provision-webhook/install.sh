#!/usr/bin/env bash
# Install / update the GleeWorld provision webhook service.
# Run once after copying this directory to /opt/gleeworld-provision-webhook.
#
# Required env file at /etc/gleeworld-provision.env with:
#   STRIPE_SECRET_KEY=sk_live_or_test_xxx
#   STRIPE_WEBHOOK_SECRET=whsec_xxx
#   RESEND_API_KEY=re_xxx
#   ROOT_DOMAIN=gleeworld.org
#   SENDER_EMAIL=welcome@gleeworld.org

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f /etc/gleeworld-provision.env ]]; then
  echo "✗ /etc/gleeworld-provision.env is missing. Create it first with:"
  echo "  STRIPE_SECRET_KEY=…"
  echo "  STRIPE_WEBHOOK_SECRET=…"
  echo "  RESEND_API_KEY=…"
  echo "  ROOT_DOMAIN=gleeworld.org"
  echo "  SENDER_EMAIL=welcome@gleeworld.org"
  exit 1
fi
chmod 600 /etc/gleeworld-provision.env

echo "▸ Installing dependencies"
cd "$DIR"
npm install --omit=dev --no-audit --no-fund > /dev/null

echo "▸ Writing systemd unit"
cat > /etc/systemd/system/gleeworld-provision.service <<UNIT
[Unit]
Description=GleeWorld Stripe → provision webhook
After=network.target

[Service]
Type=simple
EnvironmentFile=/etc/gleeworld-provision.env
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
systemctl enable gleeworld-provision.service
systemctl restart gleeworld-provision.service
sleep 1

echo "▸ Status:"
systemctl status gleeworld-provision.service --no-pager -l | head -12

echo
echo "✓ Webhook listening on http://127.0.0.1:3030"
echo "  Add nginx route: api.gleeworld.org/stripe-webhook → 127.0.0.1:3030"
