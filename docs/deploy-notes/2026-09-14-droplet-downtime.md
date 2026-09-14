# Droplet downtime — 2026-09-14 morning

**Status:** cause not yet confirmed. Nothing in this session could reach the
box (no SSH, no route to gleeworld.org, DigitalOcean mail unreadable), so the
evidence has to come from the droplet itself.

## Step 1 — collect evidence (read-only, ~10 s)

```bash
ssh root@198.211.113.144 'bash -s' < scripts/droplet-triage.sh
```

Read the eight sections in order. What each one means when it lights up:

| Section | If it shows… | Cause |
|---|---|---|
| 1 Reboots | a boot time this morning, or a DO scheduled event | Host maintenance / kernel panic. Containers without `restart: unless-stopped` stayed down after the reboot. |
| 2 OOM | `Out of memory: Killed process … (postgres\|node\|edge-runtime)` | Memory spike. Most likely an OMR job (1–2 GB), a video transcode, or Postgres autovacuum on top of ~24 containers, with **no swap** to absorb it. |
| 3 Disk | `/` or `/var` at 100%, or a multi-GB `*-json.log` | Disk full: Postgres stops accepting writes, nginx can't write logs, auth returns 500. Docker json logs are the usual culprit. |
| 4 Upgrades | `docker.io`/`containerd` upgraded around 06:xx in dpkg.log | `unattended-upgrades` restarted the docker daemon; every container went down; ones without a restart policy never came back. Classic "went down early in the morning". |
| 5 Containers | `supabase-db` / `supabase-kong` / `supabase-auth` `Exited (137)` or `(1)` | 137 = killed (OOM or daemon restart). 1 = crashed; read its log lines under the same section. |
| 6 nginx | `nginx -t` failing, a cert expiring today, `connect() failed … upstream` | Bad vhost edit, certbot renewal failed, or nginx was fine and the API behind it was down (502). |
| 7 Workers | a unit in `failed` | Only affects that feature (PartTrack, video, email), not the whole site. |
| 8 Live | 502/503 on `supabase.…/auth/v1/health` while the apex is 200 | Frontend up, backend down. Users see the shell and then every request fails. |

## Step 2 — stop it recurring

```bash
ssh root@198.211.113.144 'bash -s' < scripts/droplet-harden.sh            # dry run
ssh root@198.211.113.144 'bash -s -- --apply' < scripts/droplet-harden.sh # apply
```

Adds swap, restart policies on every container, docker log rotation, blocks
apt from restarting docker/nginx overnight, enables the workers at boot, and
installs a 2-minute self-heal cron that restarts the stack after two failed
checks and logs the event to `/var/log/gleeworld-watchdog.log`.

Then in the DigitalOcean panel (not scriptable): memory/disk/CPU alerts under
Monitoring, weekly Backups, and an external uptime check so you hear about
the next one from a monitor at 06:02 rather than from a user at 09:00.

## Step 3 — decide about size

Postgres + Kong + GoTrue + PostgREST + Realtime + Storage + edge runtime +
Studio + the OMR/video workers is a lot for one droplet. If `free -h` shows
under ~1 GB available with the site idle, resize (memory-optimised, or one
step up). Swap buys survivability during a spike; it does not add capacity.

## Never do

- `docker compose down` in `/opt/supabase` — it removes the network the
  workers depend on. Use `up -d --force-recreate <service>`.
- `systemctl restart docker` outside a window — it stops every container.
  `systemctl reload docker` picks up `daemon.json` without that.
- `rsync --delete` into the docroot (per-tenant bootstraps live there).
