#!/bin/bash
# Restore /var/www/gleeworld/html/tenants/<slug>/tenant-bootstrap.js on the
# gleeworld droplet after they've been lost (classically: a deploy rsync run
# with --delete — these files are NOT in dist/, so --delete wipes them and
# every tenant domain's /tenant-bootstrap.js 404s; happened 2026-07-07).
#
# Run ON the droplet (or: ssh root@198.211.113.144 'bash -s' < this-file).
# Idempotent — rewrites every bootstrap from current truth:
#   - slugs + org names from gw_tenants (live DB)
#   - plus any extra slug an nginx vhost aliases that has no tenant row yet
#   - anon key from /opt/supabase/.env (public key — same one baked into the
#     frontend bundle)
# Template matches /root/provision-shared-tenant.sh step 5 + the `org` field
# the app reads via window.__TENANT_CONFIG__?.org.
set -euo pipefail

HTML_ROOT=/var/www/gleeworld/html
ENV_FILE=/opt/supabase/.env

ANON_KEY=$(grep -E '^ANON_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)
[ -n "$ANON_KEY" ] || { echo "ERROR: ANON_KEY not found in $ENV_FILE" >&2; exit 1; }

write_boot() {
  local slug="$1" org="$2"
  mkdir -p "$HTML_ROOT/tenants/$slug"
  cat > "$HTML_ROOT/tenants/$slug/tenant-bootstrap.js" <<JS
window.__TENANT_CONFIG__ = {
  tenant: '$slug',
  org: "$org",
  supabaseUrl: 'https://supabase.gleeworld.org',
  supabaseAnonKey: '$ANON_KEY'
};
JS
  echo "wrote $slug ($org)"
}

# 1. Every tenant with a DB row.
declare -A seen
while IFS='|' read -r slug name; do
  [ -n "$slug" ] || continue
  write_boot "$slug" "$name"
  seen[$slug]=1
done < <(docker exec supabase-db psql -U postgres -d postgres -tAc \
  "select slug||'|'||name from public.gw_tenants;")

# 2. Any slug an nginx vhost expects that has no tenant row (e.g. a vhost
#    provisioned ahead of onboarding). Org falls back to the slug.
while read -r slug; do
  [ -n "$slug" ] && [ -z "${seen[$slug]:-}" ] || continue
  write_boot "$slug" "$slug"
  seen[$slug]=1
done < <(grep -rhoE 'tenants/[A-Za-z0-9_-]+/tenant-bootstrap\.js' /etc/nginx/sites-enabled/ \
  | sed -E 's|tenants/([A-Za-z0-9_-]+)/.*|\1|' | sort -u)

echo
echo "Verify:"
for d in $HTML_ROOT/tenants/*/; do
  slug=$(basename "$d")
  printf '  %-20s %s\n' "$slug" "$(head -c 60 "$d/tenant-bootstrap.js" | tr '\n' ' ')…"
done
