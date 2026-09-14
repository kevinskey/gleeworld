#!/usr/bin/env bash
# Make the gleeworld droplet come back on its own after the things that
# take it down: a host reboot, a memory spike, a full disk, an overnight
# apt upgrade of docker. Idempotent. DRY-RUN by default — prints what it
# would change. Re-run with --apply to do it.
#
#   ssh root@198.211.113.144 'bash -s' < scripts/droplet-harden.sh            # show
#   ssh root@198.211.113.144 'bash -s -- --apply' < scripts/droplet-harden.sh # do
#
# Run scripts/droplet-triage.sh first; this script fixes the *class* of
# failure, the triage output tells you which one actually happened.
#
# What it does (each step skips itself if already in place):
#   A. Swap (4G) — the box runs Postgres + ~24 containers + an OMR worker
#      that takes 1–2 GB per job. With no swap, a burst becomes an OOM kill
#      and the kernel picks the biggest process, which is Postgres.
#   B. vm.swappiness=10, vm.overcommit_memory=1 (Postgres-friendly).
#   C. Every container gets restart=unless-stopped, so a docker daemon
#      restart or a reboot brings the whole Supabase stack back up.
#   D. Docker log rotation (10m × 3 per container) — unbounded json logs
#      are the usual way /var fills on a long-lived compose host.
#   E. Keep unattended-upgrades from restarting docker/containerd/nginx
#      under us; pin those to manual upgrades during a window you choose.
#   F. Enable the systemd workers and pm2 resurrection on boot.
#   G. A 2-minute cron self-heal: if the apex or the API returns non-2xx/3xx
#      for two checks in a row, `docker compose up -d` and reload nginx,
#      and log it — so a 6am blip is a 4-minute blip, not "until Kevin wakes".
set -euo pipefail

APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1
run() { if [ $APPLY -eq 1 ]; then echo "+ $*"; eval "$@"; else echo "would: $*"; fi; }
hr() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
[ $APPLY -eq 1 ] || echo "(dry run — pass --apply to make changes)"

hr "A. Swap"
if swapon --show | grep -q .; then echo "swap present:"; swapon --show
else
  run "fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
  run "grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab"
fi

hr "B. Kernel memory tuning"
if [ -f /etc/sysctl.d/90-gleeworld.conf ]; then echo "already set"; cat /etc/sysctl.d/90-gleeworld.conf
else
  run "printf 'vm.swappiness=10\nvm.overcommit_memory=1\n' > /etc/sysctl.d/90-gleeworld.conf && sysctl -p /etc/sysctl.d/90-gleeworld.conf"
fi

hr "C. Container restart policies"
docker ps -a --format '{{.Names}} {{.HostConfig.RestartPolicy.Name}}' 2>/dev/null >/dev/null || true
for c in $(docker ps -aq 2>/dev/null); do
  name=$(docker inspect -f '{{.Name}}' "$c" | sed 's#^/##')
  pol=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$c")
  case "$pol" in
    always|unless-stopped) ;;
    *) run "docker update --restart unless-stopped $name" ;;
  esac
done
echo "note: 'docker update' is not persisted by compose. Also set 'restart: unless-stopped'"
echo "      on every service in /opt/supabase/docker-compose.yml (grep -c 'restart:' first)."

hr "D. Docker log rotation"
if [ -f /etc/docker/daemon.json ] && grep -q max-size /etc/docker/daemon.json; then echo "already configured"; cat /etc/docker/daemon.json
else
  echo "daemon.json rotation applies to NEW containers only; existing ones need a recreate"
  echo "(cd /opt/supabase && docker compose up -d --force-recreate) inside a maintenance window."
  run "mkdir -p /etc/docker && [ -s /etc/docker/daemon.json ] && cp /etc/docker/daemon.json /etc/docker/daemon.json.bak.\$(date +%s) || true"
  run "printf '{\n  \"log-driver\": \"json-file\",\n  \"log-opts\": { \"max-size\": \"10m\", \"max-file\": \"3\" }\n}\n' > /etc/docker/daemon.json"
  echo "then, in a window:  systemctl reload docker  (reload, not restart — restart stops every container)"
fi

hr "E. Unattended upgrades: never restart docker/containerd/nginx on their own"
if [ -f /etc/apt/apt.conf.d/51gleeworld-unattended ]; then echo "already pinned"; cat /etc/apt/apt.conf.d/51gleeworld-unattended
else
  run "printf 'Unattended-Upgrade::Package-Blacklist {\n  \"docker-ce\"; \"docker-ce-cli\"; \"docker.io\"; \"containerd.io\"; \"containerd\"; \"nginx\"; \"nginx-core\"; \"nginx-common\"; \"postgresql\";\n};\nUnattended-Upgrade::Automatic-Reboot \"false\";\n' > /etc/apt/apt.conf.d/51gleeworld-unattended"
fi

hr "F. Workers enabled at boot"
for u in gleeworld-parttrack-worker gleeworld-video-worker gleeworld-smtp-bridge; do
  if systemctl list-unit-files "$u.service" --no-legend 2>/dev/null | grep -q .; then
    systemctl is-enabled "$u" >/dev/null 2>&1 && echo "$u: enabled" || run "systemctl enable $u"
  else echo "$u: not installed here (fine)"; fi
done
if command -v pm2 >/dev/null; then
  [ -f /etc/systemd/system/pm2-root.service ] && echo "pm2 startup: present" || run "pm2 startup systemd -u root --hp /root >/dev/null && pm2 save"
fi

hr "G. Self-heal watchdog (cron, every 2 min)"
WD=/usr/local/bin/gleeworld-watchdog.sh
if [ -x "$WD" ]; then echo "installed: $WD"
else
  run "cat > $WD <<'W'
#!/usr/bin/env bash
# Two consecutive failures of either endpoint -> restart the stack. Logged to
# /var/log/gleeworld-watchdog.log so a 6am incident leaves evidence.
STATE=/run/gleeworld-watchdog.fail
ok() { c=\$(curl -s -o /dev/null -m 10 -w '%{http_code}' \"\$1\"); [[ \$c =~ ^[23] ]]; }
if ok https://gleeworld.org/ && ok https://supabase.gleeworld.org/auth/v1/health; then rm -f \$STATE; exit 0; fi
n=\$(( \$(cat \$STATE 2>/dev/null || echo 0) + 1 )); echo \$n > \$STATE
[ \$n -ge 2 ] || exit 0
echo \"\$(date -Is) DOWN x\$n: free=\$(free -m | awk '/Mem/{print \$7}')MB disk=\$(df -h / | awk 'NR==2{print \$5}') — restarting\" >> /var/log/gleeworld-watchdog.log
nginx -t >/dev/null 2>&1 && systemctl reload nginx || systemctl restart nginx
cd /opt/supabase && docker compose up -d >> /var/log/gleeworld-watchdog.log 2>&1
rm -f \$STATE
W
chmod +x $WD"
  run "( crontab -l 2>/dev/null | grep -v gleeworld-watchdog; echo '*/2 * * * * $WD' ) | crontab -"
fi

hr "Done"
echo "Still to do in the DigitalOcean control panel (cannot be scripted from here):"
echo "  - Droplet -> Monitoring -> install the metrics agent if missing, then Alerts:"
echo "      memory > 85% for 5m, disk > 80%, CPU > 90% for 10m  -> email + Slack"
echo "  - Droplet -> Backups: turn on weekly backups (or snapshot before every stack change)"
echo "  - An external uptime check (UptimeRobot / Better Stack free tier) on"
echo "      https://gleeworld.org and https://supabase.gleeworld.org/auth/v1/health, 1-min interval"
echo "  - If free -h shows < 1 GB headroom with everything idle, resize the droplet;"
echo "      swap makes a spike survivable, it does not make a too-small box big enough."
