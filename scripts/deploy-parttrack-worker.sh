#!/usr/bin/env bash
# Deploy the PartTrack renderer worker to the droplet.
# Never uses --delete (repo rule). First-time setup steps are in
# worker/parttrack-renderer/DEPLOY.md.
set -euo pipefail
HOST=${1:?usage: deploy-parttrack-worker.sh user@droplet}
DEST=/opt/gleeworld-parttrack-worker

rsync -avz --exclude '.venv' --exclude '__pycache__' --exclude 'tests' \
  worker/parttrack-renderer/ "$HOST:$DEST/"

ssh "$HOST" "cd $DEST && \
  python3 -m venv .venv 2>/dev/null || true && \
  .venv/bin/pip install -q -r requirements.txt && \
  .venv/bin/python -c 'import main' && \
  sudo systemctl restart gleeworld-parttrack-worker && \
  sudo systemctl --no-pager status gleeworld-parttrack-worker | head -5"
