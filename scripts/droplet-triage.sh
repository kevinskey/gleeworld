#!/usr/bin/env bash
# Read-only evidence collector for "the site was down this morning".
#
# Run ON the droplet:
#   ssh root@198.211.113.144 'bash -s' < scripts/droplet-triage.sh
# or pass a window start (default: 06:00 today, server local time):
#   ssh root@198.211.113.144 'bash -s -- "2026-09-14 05:30"' < scripts/droplet-triage.sh
#
# It changes nothing. It answers, in order, the questions that account for
# nearly every unplanned outage on this box:
#   1. Did the droplet reboot (DigitalOcean maintenance / kernel panic)?
#   2. Did the kernel OOM-kill something (Postgres, nginx, edge runtime)?
#   3. Did the disk fill (WAL, docker logs, uploads)?
#   4. Did unattended-upgrades restart docker/containerd overnight?
#   5. Which containers exited, with what code, and do they auto-restart?
#   6. Did nginx fail (config, cert renewal, upstream 502)?
#   7. Are the systemd/pm2 workers up?
#   8. Is it up right now, from the box's own point of view?
set -uo pipefail

SINCE="${1:-$(date +%F) 06:00}"
hr() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

hr "Host / window"
hostname; date; echo "window start: $SINCE"

hr "1. Reboots"
echo "uptime: $(uptime -p)  (booted $(uptime -s))"
last -x reboot shutdown 2>/dev/null | head -5
journalctl --list-boots --no-pager 2>/dev/null | tail -3
# DigitalOcean announces host maintenance / live-migration via metadata.
echo "DO metadata events:"
curl -s -m 3 http://169.254.169.254/metadata/v1/scheduled_events 2>/dev/null || echo "  (not available)"

hr "2. OOM kills since window"
journalctl -k --since "$SINCE" --no-pager 2>/dev/null | grep -i -E 'out of memory|oom-kill|killed process' | tail -20 \
  || dmesg -T 2>/dev/null | grep -i -E 'out of memory|oom-kill|killed process' | tail -20
echo "(empty = no OOM kill in window)"

hr "3. Memory / swap / disk right now"
free -h
echo "swap devices:"; swapon --show || echo "  NONE — see scripts/droplet-harden.sh"
df -h / /var /opt 2>/dev/null | sort -u
echo "largest docker consumers:"; docker system df 2>/dev/null
echo "container log sizes:"; du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -rh | head -5
echo "postgres volume:"; du -sh /opt/supabase/volumes/db 2>/dev/null

hr "4. Package upgrades / docker restarts since window"
grep -h -E "^$(date +%F)" /var/log/dpkg.log 2>/dev/null | grep -E ' (upgrade|remove) ' | tail -15
grep -h -i -E "docker|containerd|nginx|restart" /var/log/unattended-upgrades/unattended-upgrades.log 2>/dev/null | tail -10
journalctl -u docker -u containerd --since "$SINCE" --no-pager 2>/dev/null | grep -i -E 'start|stop|shutdown|error|fail' | tail -15
systemctl list-timers apt-daily-upgrade.timer apt-daily.timer --no-pager 2>/dev/null

hr "5. Containers: state, exit code, restart policy"
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.RunningFor}}' 2>/dev/null | sort
echo
docker ps -a --format '{{.Names}}' 2>/dev/null | while read -r c; do
  printf '%-32s exit=%-4s restarts=%-3s policy=%s\n' "$c" \
    "$(docker inspect -f '{{.State.ExitCode}}' "$c")" \
    "$(docker inspect -f '{{.RestartCount}}' "$c")" \
    "$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$c")"
done | sort
echo "docker events since window (die/oom/restart):"
docker events --since "$(date -d "$SINCE" +%s)" --until "$(date +%s)" \
  --filter event=die --filter event=oom --filter event=restart --filter event=kill 2>/dev/null \
  --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}} exit={{.Actor.Attributes.exitCode}}' | tail -40
echo "recent errors from the DB and the API gateway:"
docker logs supabase-db --since "$SINCE" 2>&1 | grep -i -E 'fatal|panic|error|terminated|shutdown' | tail -10
docker logs supabase-kong --since "$SINCE" 2>&1 | grep -i -E 'error|refused|timeout' | tail -10

hr "6. nginx"
systemctl status nginx --no-pager -l 2>/dev/null | head -6
nginx -t 2>&1 | tail -2
journalctl -u nginx --since "$SINCE" --no-pager 2>/dev/null | tail -10
echo "5xx per hour today (access log):"
awk -v d="$(date +%d/%b/%Y)" '$4 ~ d && $9 ~ /^5/ {split($4,t,":"); c[t[2]]++} END {for (h in c) print "  " h ":00 -> " c[h]}' /var/log/nginx/access.log 2>/dev/null | sort
echo "last upstream errors:"; grep -i -E 'upstream|connect\(\) failed|no live' /var/log/nginx/error.log 2>/dev/null | tail -8
echo "TLS expiry:"
for d in gleeworld.org supabase.gleeworld.org; do
  printf '  %-26s ' "$d"; echo | openssl s_client -servername "$d" -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null || echo "?"
done
journalctl -u certbot.timer -u certbot.service --since "$(date -d '2 days ago' +%F)" --no-pager 2>/dev/null | tail -5

hr "7. Workers"
systemctl --no-pager --failed 2>/dev/null
for u in gleeworld-parttrack-worker gleeworld-video-worker gleeworld-smtp-bridge; do
  printf '  %-30s %s\n' "$u" "$(systemctl is-active "$u" 2>/dev/null)"
done
command -v pm2 >/dev/null && pm2 ls 2>/dev/null | grep -E 'gleeworld|status' || echo "  pm2 not installed / no apps"

hr "8. Live check from the box"
for u in https://gleeworld.org/ https://gleeworld.org/sw.js https://supabase.gleeworld.org/rest/v1/ https://supabase.gleeworld.org/auth/v1/health; do
  printf '  %-48s ' "$u"; curl -s -o /dev/null -m 10 -w 'http=%{http_code} %{time_total}s\n' "$u" || echo "FAILED"
done

hr "Done"
echo "Paste this output back into the session for a root-cause read."
