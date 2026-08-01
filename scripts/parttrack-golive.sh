#!/usr/bin/env bash
# One-shot PartTrack go-live: migration -> worker setup -> worker deploy -> frontend.
# Run from the worktree root. Idempotent; safe to re-run.
set -euo pipefail
H=root@198.211.113.144

echo "==> 1/4 apply migration"
ssh "$H" "docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1" \
  < supabase/migrations/20260801090000_parttrack_pipeline.sql

echo "==> 2/4 one-time worker setup"
ssh "$H" 'bash -s' <<'EOF'
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -q fluidsynth ffmpeg python3-venv >/dev/null
id parttrack >/dev/null 2>&1 || useradd -r -m -d /opt/gleeworld-parttrack-worker parttrack
mkdir -p /opt/gleeworld-parttrack/soundfonts
if [ ! -s /opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2 ]; then
  curl -sL -o /tmp/fluid.tar.gz https://ftp.osuosl.org/pub/musescore/soundfont/fluid-soundfont.tar.gz
  tar -xzf /tmp/fluid.tar.gz -C /tmp "FluidR3 GM2-2.SF2"
  mv "/tmp/FluidR3 GM2-2.SF2" /opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2
fi
DBURL=$(grep -m1 "^DATABASE_URL=" /etc/gleeworld-video-worker.env | cut -d= -f2-)
SRK=$(grep -m1 -E "^(SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY)=" /opt/supabase/.env | cut -d= -f2-)
[ -n "$DBURL" ] || { echo "!! no DATABASE_URL in /etc/gleeworld-video-worker.env"; exit 1; }
[ -n "$SRK" ] || { echo "!! no service key in /opt/supabase/.env"; exit 1; }
printf 'DATABASE_URL=%s\nSUPABASE_URL=https://supabase.gleeworld.org\nSUPABASE_SERVICE_KEY=%s\nSOUNDFONT_PATH=/opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2\nPOLL_INTERVAL_S=5\n' \
  "$DBURL" "$SRK" > /etc/gleeworld-parttrack-worker.env
chmod 600 /etc/gleeworld-parttrack-worker.env
echo one-time-setup-done
EOF

echo "==> 3/4 worker deploy"
scp worker/parttrack-renderer/gleeworld-parttrack-worker.service "$H":/etc/systemd/system/
ssh "$H" "systemctl daemon-reload && systemctl enable gleeworld-parttrack-worker >/dev/null 2>&1 || true"
bash scripts/deploy-parttrack-worker.sh "$H"
ssh "$H" "chown -R parttrack:parttrack /opt/gleeworld-parttrack-worker"

echo "==> 4/4 frontend deploy"
bash scripts/deploy-frontend.sh

echo "==> go-live complete"
