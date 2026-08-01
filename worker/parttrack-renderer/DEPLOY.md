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

## Audiveris (Phase 3: PDF → MusicXML OMR) — one-time setup

Audiveris is invoked as an unmodified separate-process CLI (no linking,
no modification — nothing of it ships in GleeWorld).

```bash
sudo apt-get install -y openjdk-21-jre-headless  # 5.9 needs Java 21; 5.3+ works with 17
# Download the current Linux release from https://github.com/Audiveris/audiveris/releases
# (either the .deb, or the -linux zip extracted to /opt/audiveris).
# Example for a .deb:
#   curl -LO https://github.com/Audiveris/audiveris/releases/download/<tag>/<Audiveris-...>.deb
#   sudo apt-get install -y ./<Audiveris-...>.deb
# Verify (binary name/path varies by package — find it, then pin it):
#   /opt/audiveris/bin/Audiveris -help     # typical .deb layout
sudo tee -a /etc/gleeworld-parttrack-worker.env <<'EOF'
AUDIVERIS_CMD=/opt/audiveris/bin/Audiveris
EOF
sudo systemctl restart gleeworld-parttrack-worker
```

Notes: OMR jobs run up to 10 minutes (hard timeout) and ~1–2 GB RAM per
job; the worker is single-threaded so jobs queue rather than stack. If
Audiveris is absent, PDF jobs fail with a clear "not set up on this
server" message — MusicXML/MIDI flows are unaffected.
