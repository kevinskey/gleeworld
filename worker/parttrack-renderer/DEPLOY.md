# PartTrack worker — one-time droplet setup

```bash
sudo useradd -r -m -d /opt/gleeworld-parttrack-worker parttrack
sudo apt-get install -y fluidsynth ffmpeg python3-venv
sudo mkdir -p /opt/gleeworld-parttrack/soundfonts
# FluidR3_GM (MIT) — e.g. the MuseScore mirror:
#   curl -L -o /tmp/fluid.tar.gz https://ftp.osuosl.org/pub/musescore/soundfont/fluid-soundfont.tar.gz
#   tar -xzf /tmp/fluid.tar.gz -C /tmp "FluidR3 GM2-2.SF2"
#   sudo mv "/tmp/FluidR3 GM2-2.SF2" /opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2
sudo tee /etc/gleeworld-parttrack-worker.env <<'EOF'
DATABASE_URL=postgresql://postgres:<pw>@localhost:5432/postgres
SUPABASE_URL=https://supabase.gleeworld.org
SUPABASE_SERVICE_KEY=<service key from /opt/supabase/.env>
SOUNDFONT_PATH=/opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2
POLL_INTERVAL_S=5
EOF
sudo chmod 600 /etc/gleeworld-parttrack-worker.env
sudo cp gleeworld-parttrack-worker.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable gleeworld-parttrack-worker
```

Keep the FluidR3_GM license/readme file beside the soundfont.
Deploys after setup: `scripts/deploy-parttrack-worker.sh user@droplet`
(syntax-checks with `python -c 'import main'` before restarting — same rule
as `node --check` for the Node workers).
