#!/bin/bash
# CPDL allpages backfill — runs pd-ingest-cpdl in a loop until next_continue
# returns null on TWO consecutive responses. Persists cursor + a JSONL log
# so we can resume after restart.
#
# Deployed copy: /opt/cpdl-backfill.sh on the supabase droplet
#   (198.211.113.144). Run detached via:
#     nohup /opt/cpdl-backfill.sh </dev/null >>/var/log/cpdl-driver-stdout.log 2>&1 & disown
#
# Pace knobs (2026-06-30): bumped from 5 pages / 1500ms / 60s sleep
# to 10 pages / 750ms / 20s sleep to roughly 4-5x throughput. CPDL still
# 500s intermittently — those errors are caught upstream and skipped.

set -u
URL="https://supabase.gleeworld.org/functions/v1/pd-ingest-cpdl"
KEY=$(grep -E "^SERVICE_ROLE_KEY=" /opt/supabase/.env | cut -d= -f2-)
CURSOR_FILE=/var/log/cpdl-cursor.txt
LOG_FILE=/var/log/cpdl-backfill.log

touch "$CURSOR_FILE" "$LOG_FILE"
cursor=$(cat "$CURSOR_FILE")
empty_streak=0

while true; do
  if [ -z "$cursor" ]; then
    BODY="{\"mode\":\"allpages\",\"max_pages\":10,\"delay_ms\":750}"
  else
    BODY="{\"mode\":\"allpages\",\"max_pages\":10,\"delay_ms\":750,\"continue_token\":\"$cursor\"}"
  fi

  resp=$(curl -sS -X POST "$URL" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "$BODY") || { echo "$(date -Is) curl_failed" >> "$LOG_FILE"; sleep 30; continue; }

  echo "$(date -Is) $resp" >> "$LOG_FILE"

  next=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get(\"next_continue\") or \"\")")
  pages=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get(\"pages_discovered\", 0))")

  if [ -z "$next" ] && echo "$resp" | grep -q "\"ok\":true"; then
    if [ "$pages" -eq 0 ]; then
      empty_streak=$((empty_streak + 1))
      echo "$(date -Is) empty response streak=$empty_streak" >> "$LOG_FILE"
      if [ "$empty_streak" -ge 5 ]; then
        echo "$(date -Is) done — five consecutive empty responses" >> "$LOG_FILE"
        break
      fi
      sleep 60
      continue
    else
      echo "$(date -Is) done — next_continue was null after non-empty response" >> "$LOG_FILE"
      break
    fi
  fi

  empty_streak=0
  if [ -n "$next" ]; then
    echo "$next" > "$CURSOR_FILE"
    cursor="$next"
  fi

  sleep 20
done
