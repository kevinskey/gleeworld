#!/usr/bin/env bash
#
# provision-tenant.sh — one-command tenant provisioner.
#
# Codifies the working flow we validated with the testchoir test:
#   1. Clone /opt/supabase → /opt/supabase-<slug>
#   2. Generate fresh JWT/anon/service/db keys
#   3. Pick next-free ports (Postgres, Kong HTTP/HTTPS, Pooler)
#   4. Rename containers so they don't clash with existing stacks
#   5. docker compose -p <slug> up -d
#   6. Wait for db + kong healthy
#   7. Dump main DB schema and load into the new tenant DB
#   8. Seed gw_modules + gw_branding_settings defaults
#   9. Create the admin user via the Auth admin API
#  10. Promote that user to super-admin in gw_profiles
#  11. Install nginx server block and per-tenant tenant-bootstrap.js
#  12. Issue Let's Encrypt cert (or warn if DNS not yet pointed at droplet)
#  13. Generate a password-recovery link for the admin
#
# Usage:
#   sudo ./provision-tenant.sh \
#     --org "The Golden Gate Singers Institute" \
#     --short "Golden Gate Singers" \
#     --email admin@org.com \
#     --subdomain ggsi
#
# Pass --no-ssl to skip certbot (e.g., if DNS isn't set up yet).

set -euo pipefail

# ── defaults ─────────────────────────────────────────────────────────────────
ROOT_DOMAIN="${ROOT_DOMAIN:-gleeworld.org}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="${WEB_ROOT:-/var/www/gleeworld/html}"
SUPABASE_TEMPLATE="${SUPABASE_TEMPLATE:-/opt/supabase}"
MAIN_DB_CONTAINER="${MAIN_DB_CONTAINER:-supabase-db}"
SEEDS_FILE="${SEEDS_FILE:-$SCRIPT_DIR/tenant-seeds.sql}"

# ── parse args ───────────────────────────────────────────────────────────────
ORG=""
SHORT=""
EMAIL=""
SUBDOMAIN=""
SKIP_SSL=0

usage() {
  cat <<USAGE
Usage: $0 --org "<Organization>" --email <admin@org.com> --subdomain <slug>
          [--short "<Short Name>"] [--no-ssl]
USAGE
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org)        ORG="$2"; shift 2 ;;
    --short)      SHORT="$2"; shift 2 ;;
    --email)      EMAIL="$2"; shift 2 ;;
    --subdomain)  SUBDOMAIN="$2"; shift 2 ;;
    --no-ssl)     SKIP_SSL=1; shift ;;
    -h|--help)    usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
done

[[ -z "$ORG" || -z "$EMAIL" || -z "$SUBDOMAIN" ]] && usage
[[ -z "$SHORT" ]] && SHORT="$ORG"

if ! [[ "$SUBDOMAIN" =~ ^[a-z][a-z0-9-]{1,30}$ ]]; then
  echo "✗ Subdomain must be lowercase, start with a letter, only a-z 0-9 -" >&2
  exit 1
fi

if [[ -d "/opt/supabase-$SUBDOMAIN" ]]; then
  echo "✗ /opt/supabase-$SUBDOMAIN already exists. Pick a different subdomain or remove it first." >&2
  exit 1
fi

TENANT_DIR="/opt/supabase-$SUBDOMAIN"
TENANT_HOST="$SUBDOMAIN.$ROOT_DOMAIN"
PROJECT="$SUBDOMAIN"

# ── pick next free ports ─────────────────────────────────────────────────────
# Each tenant adds +2 to base (Postgres 5434, Kong 8000/8443, Pooler 6543).
# Iterate until we find an unused set.
find_ports() {
  local i=2
  while true; do
    PG_PORT=$((5434 + i))
    KONG_HTTP=$((8000 + 100 * (i / 2)))
    KONG_HTTPS=$((8443 + 100 * (i / 2)))
    POOLER=$((6543 + i))
    if ! ss -tlnp 2>/dev/null | grep -qE ":($PG_PORT|$KONG_HTTP|$KONG_HTTPS|$POOLER) "; then
      return
    fi
    i=$((i + 2))
    [[ $i -gt 30 ]] && { echo "✗ No free port window found" >&2; exit 1; }
  done
}
find_ports

echo "▸ Provisioning $ORG"
echo "    Subdomain:   $TENANT_HOST"
echo "    Admin:       $EMAIL"
echo "    Stack dir:   $TENANT_DIR"
echo "    Ports:       postgres=$PG_PORT  kong=$KONG_HTTP/$KONG_HTTPS  pooler=$POOLER"
echo

# ── 1. Clone Supabase config ─────────────────────────────────────────────────
echo "▸ Cloning Supabase config (no data)"
mkdir -p "$TENANT_DIR"
rsync -a \
  --exclude='volumes/db/data' \
  --exclude='volumes/storage' \
  --exclude='volumes/logs/*' \
  "$SUPABASE_TEMPLATE/" "$TENANT_DIR/"

# ── 2. Generate keys ─────────────────────────────────────────────────────────
echo "▸ Generating JWT + DB keys"
cd "$TENANT_DIR"
sh utils/generate-keys.sh --update-env > /tmp/provision-keys.log 2>&1

# ── 3. Set ports + external URL ──────────────────────────────────────────────
echo "▸ Configuring ports + URLs"
sed -i \
  -e "s/^POSTGRES_PORT=.*/POSTGRES_PORT=$PG_PORT/" \
  -e "s/^KONG_HTTP_PORT=.*/KONG_HTTP_PORT=$KONG_HTTP/" \
  -e "s/^KONG_HTTPS_PORT=.*/KONG_HTTPS_PORT=$KONG_HTTPS/" \
  -e "s/^POOLER_PROXY_PORT_TRANSACTION=.*/POOLER_PROXY_PORT_TRANSACTION=$POOLER/" \
  -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://$TENANT_HOST|" \
  -e "s|^SITE_URL=.*|SITE_URL=https://$TENANT_HOST|" \
  -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://$TENANT_HOST|" \
  .env

# ── 4. Rename containers so they don't collide ───────────────────────────────
echo "▸ Renaming containers"
sed -i \
  -e "s/container_name: supabase-/container_name: $SUBDOMAIN-supabase-/g" \
  -e "s/container_name: realtime-dev.supabase-realtime/container_name: $SUBDOMAIN-realtime/g" \
  docker-compose.yml

# ── 5. Start the stack ───────────────────────────────────────────────────────
echo "▸ Starting Supabase stack (docker compose -p $PROJECT up -d)"
docker compose -p "$PROJECT" up -d > /tmp/provision-compose.log 2>&1

# ── 6. Wait for db + kong to be healthy ──────────────────────────────────────
echo "▸ Waiting for db + kong to be healthy"
for svc in "$SUBDOMAIN-supabase-db" "$SUBDOMAIN-supabase-kong"; do
  for i in {1..40}; do
    state=$(docker inspect -f '{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "missing")
    [[ "$state" == "healthy" ]] && break
    [[ $i -eq 40 ]] && { echo "✗ $svc never became healthy" >&2; exit 1; }
    sleep 2
  done
done

# ── 7. Load main DB schema into tenant ───────────────────────────────────────
echo "▸ Loading public schema from main DB → tenant DB"
docker exec "$MAIN_DB_CONTAINER" pg_dump -U postgres -d postgres \
  --schema-only --no-owner --no-privileges --schema=public \
  > /tmp/provision-schema.sql 2>/tmp/provision-schema-dump.log
cat /tmp/provision-schema.sql | docker exec -i "$SUBDOMAIN-supabase-db" psql -U postgres -d postgres \
  > /tmp/provision-schema-load.log 2>&1

# Single expected error is "schema public already exists" — anything else is real
if grep -E "^(ERROR|FATAL)" /tmp/provision-schema-load.log | grep -v 'schema "public" already exists' | head -3 ; then
  echo "  ⚠ Non-fatal errors above (functions/policies referencing late-bound tables — safe)"
fi

# ── 8. Seed defaults ─────────────────────────────────────────────────────────
echo "▸ Seeding default modules + branding row"
if [[ -f "$SEEDS_FILE" ]]; then
  cat "$SEEDS_FILE" | docker exec -i "$SUBDOMAIN-supabase-db" psql -U postgres -d postgres \
    > /tmp/provision-seeds.log 2>&1 || true
fi
docker exec "$SUBDOMAIN-supabase-db" psql -U postgres -d postgres -c \
  "INSERT INTO public.gw_branding_settings (id, org_name, short_name, primary_color, setup_completed)
   VALUES (1, '$ORG', '$SHORT', '#003666', FALSE)
   ON CONFLICT (id) DO UPDATE SET org_name = EXCLUDED.org_name, short_name = EXCLUDED.short_name;" \
  > /dev/null

# ── 9. Create admin user via Auth API ────────────────────────────────────────
echo "▸ Creating admin user $EMAIL"
TENANT_ANON=$(grep ^ANON_KEY= .env | cut -d= -f2)
TENANT_SVC=$(grep ^SERVICE_ROLE_KEY= .env | cut -d= -f2)
TEMP_PW="$SUBDOMAIN-$(openssl rand -hex 4)"

ADMIN_RESP=$(curl -s -X POST "http://127.0.0.1:$KONG_HTTP/auth/v1/admin/users" \
  -H "apikey: $TENANT_SVC" \
  -H "Authorization: Bearer $TENANT_SVC" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$TEMP_PW\",\"email_confirm\":true,\"user_metadata\":{\"org_name\":\"$ORG\"}}")

ADMIN_ID=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
if [[ -z "$ADMIN_ID" ]]; then
  echo "✗ Admin user creation failed:" >&2
  echo "$ADMIN_RESP" | head -c 600 >&2
  exit 1
fi

# ── 10. Promote to super-admin in gw_profiles ────────────────────────────────
echo "▸ Promoting to super-admin in gw_profiles (bypassing wardrobe sync trigger)"
docker exec "$SUBDOMAIN-supabase-db" psql -U postgres -d postgres -c \
  "SET session_replication_role = replica;
   INSERT INTO public.gw_profiles (id, user_id, email, first_name, is_super_admin, is_admin, role, created_at, updated_at)
   VALUES ('$ADMIN_ID', '$ADMIN_ID', '$EMAIL', 'Admin', TRUE, TRUE, 'super-admin', NOW(), NOW())
   ON CONFLICT (id) DO UPDATE SET is_super_admin = TRUE, is_admin = TRUE, role = 'super-admin';" \
  > /dev/null

# ── 11. nginx server block + tenant bootstrap ────────────────────────────────
echo "▸ Writing nginx config + tenant bootstrap"
mkdir -p "$WEB_ROOT/tenants/$SUBDOMAIN"
cat > "$WEB_ROOT/tenants/$SUBDOMAIN/tenant-bootstrap.js" <<JS
// Generated by provision-tenant.sh for $TENANT_HOST — DO NOT EDIT BY HAND.
window.__TENANT_CONFIG__ = {
  tenant: "$SUBDOMAIN",
  org: "$ORG",
  shortName: "$SHORT",
  supabaseUrl: "https://$TENANT_HOST",
  supabaseAnonKey: "$TENANT_ANON"
};
JS

cat > "/etc/nginx/sites-available/$TENANT_HOST" <<NGINX
server {
    listen 80;
    server_name $TENANT_HOST;
    root $WEB_ROOT;
    index index.html;
    client_max_body_size 50M;

    location = /tenant-bootstrap.js {
        alias $WEB_ROOT/tenants/$SUBDOMAIN/tenant-bootstrap.js;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        add_header Content-Type "application/javascript";
    }

    location /cdn/ {
        proxy_pass https://glee-world.sfo3.digitaloceanspaces.com/;
        proxy_set_header Host glee-world.sfo3.digitaloceanspaces.com;
        proxy_ssl_server_name on;
        add_header Cache-Control "public, max-age=86400";
        add_header Access-Control-Allow-Origin "*" always;
    }

    location ~ ^/(auth|rest|realtime|storage|functions)/ {
        proxy_pass http://127.0.0.1:$KONG_HTTP;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/$TENANT_HOST" "/etc/nginx/sites-enabled/"
nginx -t > /tmp/provision-nginx.log 2>&1
systemctl reload nginx

# ── 12. SSL ──────────────────────────────────────────────────────────────────
SSL_NOTE=""
if [[ "$SKIP_SSL" -eq 1 ]]; then
  SSL_NOTE="SSL skipped (--no-ssl). Run later: certbot --nginx -d $TENANT_HOST"
else
  echo "▸ Issuing SSL cert for $TENANT_HOST"
  if certbot --nginx -d "$TENANT_HOST" --non-interactive --agree-tos -m "$EMAIL" --redirect > /tmp/provision-certbot.log 2>&1; then
    SSL_NOTE="SSL issued for $TENANT_HOST"
  else
    SSL_NOTE="⚠ certbot failed — likely DNS not pointing at this droplet yet. Re-run later: certbot --nginx -d $TENANT_HOST"
  fi
fi

# ── 13. Generate recovery link ───────────────────────────────────────────────
echo "▸ Generating password recovery link"
LINK=$(curl -s -X POST "http://127.0.0.1:$KONG_HTTP/auth/v1/admin/generate_link" \
  -H "apikey: $TENANT_SVC" \
  -H "Authorization: Bearer $TENANT_SVC" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"recovery\",\"email\":\"$EMAIL\",\"options\":{\"redirect_to\":\"https://$TENANT_HOST/auth\"}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('action_link',''))" 2>/dev/null)

# ── Summary ──────────────────────────────────────────────────────────────────
cat <<DONE

═══════════════════════════════════════════════════════════════════════════════
  ✓ Tenant provisioned: $ORG

  Site:        https://$TENANT_HOST
  API:         https://$TENANT_HOST/auth/v1, /rest/v1, /storage/v1, ...
  Admin:       $EMAIL
  Stack dir:   $TENANT_DIR
  Postgres:    127.0.0.1:$PG_PORT (container $SUBDOMAIN-supabase-db)
  Kong:        127.0.0.1:$KONG_HTTP
  Pooler:      127.0.0.1:$POOLER

  $SSL_NOTE

  Send this link to the admin so they can set their password:

    $LINK

  Temporary password (if they prefer to log in directly):
    $TEMP_PW

═══════════════════════════════════════════════════════════════════════════════
DONE
