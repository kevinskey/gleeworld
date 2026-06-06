#!/usr/bin/env bash
#
# configure-smtp.sh — set SMTP credentials on the main stack and every
# existing tenant stack, then restart their auth containers so password-reset
# / signup-confirm emails actually leave the server.
#
# Recommended providers (all have free tiers):
#   Resend       smtp.resend.com  port 465  user: resend  pass: re_xxxxxx
#   Postmark     smtp.postmarkapp.com  port 587  user/pass: server token
#   Brevo        smtp-relay.brevo.com  port 587  user: SMTP-LOGIN  pass: smtp-key
#   Mailgun      smtp.mailgun.org  port 587  user/pass: per-domain SMTP creds
#
# Usage:
#   sudo ./configure-smtp.sh \
#     --host smtp.resend.com \
#     --port 465 \
#     --user resend \
#     --pass "re_xxxxxxxxxxxxxxxxxxxxxxxx" \
#     --from "hello@gleeworld.org" \
#     --sender "GleeWorld"

set -euo pipefail

HOST=""; PORT=""; USER=""; PASS=""; FROM=""; SENDER="GleeWorld"

usage() {
  cat <<USAGE
Usage: $0 --host <smtp-host> --port <port> --user <user> --pass <password>
          --from <from-email> [--sender <name>]
USAGE
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --user) USER="$2"; shift 2 ;;
    --pass) PASS="$2"; shift 2 ;;
    --from) FROM="$2"; shift 2 ;;
    --sender) SENDER="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
done

[[ -z "$HOST" || -z "$PORT" || -z "$USER" || -z "$PASS" || -z "$FROM" ]] && usage

# Find every stack: main is /opt/supabase, tenants are /opt/supabase-<slug>
STACKS=()
[[ -d /opt/supabase ]] && STACKS+=("/opt/supabase")
for d in /opt/supabase-*; do
  [[ -d "$d" ]] && STACKS+=("$d")
done

if [[ ${#STACKS[@]} -eq 0 ]]; then
  echo "✗ No Supabase stacks found in /opt" >&2
  exit 1
fi

echo "▸ Configuring SMTP on ${#STACKS[@]} stack(s)"

for STACK in "${STACKS[@]}"; do
  echo "  → $STACK"
  # Replace each SMTP_* line in .env
  sed -i \
    -e "s|^SMTP_HOST=.*|SMTP_HOST=$HOST|" \
    -e "s|^SMTP_PORT=.*|SMTP_PORT=$PORT|" \
    -e "s|^SMTP_USER=.*|SMTP_USER=$USER|" \
    -e "s|^SMTP_PASS=.*|SMTP_PASS=$PASS|" \
    -e "s|^SMTP_ADMIN_EMAIL=.*|SMTP_ADMIN_EMAIL=$FROM|" \
    -e "s|^SMTP_SENDER_NAME=.*|SMTP_SENDER_NAME=$SENDER|" \
    "$STACK/.env"

  # Determine docker compose project name from directory
  if [[ "$STACK" == "/opt/supabase" ]]; then
    PROJECT=""
  else
    PROJECT="-p ${STACK##*/supabase-}"
  fi

  # Restart auth container to pick up new env
  cd "$STACK"
  echo "    restarting auth container..."
  docker compose $PROJECT up -d --force-recreate auth > /dev/null 2>&1 || true
done

cat <<DONE

═════════════════════════════════════════════════════════════════════════════
  ✓ SMTP configured

  Provider: $HOST:$PORT
  From:     $FROM  (sender: $SENDER)
  Stacks:   ${#STACKS[@]} updated

  Test it: from any tenant, click "Forgot password" — a real email
  should arrive within 60 seconds.

  If emails don't arrive:
    1. Check the provider dashboard for delivery logs.
    2. Verify your sending domain in the provider (DKIM/SPF/MX).
    3. View auth container logs:  docker logs supabase-auth --tail 50
═════════════════════════════════════════════════════════════════════════════
DONE
