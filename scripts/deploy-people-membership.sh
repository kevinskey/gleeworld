#!/usr/bin/env bash
# SUPERSEDED by scripts/deploy-member-access.sh (2026-11-01), which applies
# this migration plus 20261101120000 and verifies both. Kept for reference.
#
# One-shot deploy for the 2026-10-31 People/membership fix:
#   1. apply migration 20261031120000 (mirror GleeWorld members into Yo-Doc,
#      gw_tenant_roster / gw_update_tenant_member RPCs) on the self-hosted DB
#   2. verify the trigger + both RPCs exist and print Yo-Doc members by role
#   3. deploy the web frontend (People page now lists by membership)
#
# Run from a machine that holds the droplet SSH key:
#   bash scripts/deploy-people-membership.sh
#   bash scripts/deploy-people-membership.sh --db-only     # skip the web deploy
#
# The migration file carries its own BEGIN/COMMIT, so psql is NOT given
# --single-transaction here (that would nest and warn). ON_ERROR_STOP makes a
# failure inside the block roll everything back.
set -euo pipefail

DROPLET="root@198.211.113.144"
MIG="supabase/migrations/20261031120000_mirror_main_members_into_yodoc.sql"
cd "$(dirname "$0")/.."

[ -f "$MIG" ] || { echo "✖ $MIG not found — are you on main and pulled?" >&2; exit 1; }

psql_remote() { ssh "$DROPLET" "docker exec supabase-db psql -U postgres -d postgres -tAc \"$1\""; }

echo "=== [1/3] apply migration ==="
scp "$MIG" "$DROPLET:/tmp/people_membership.sql"
ssh "$DROPLET" "docker cp /tmp/people_membership.sql supabase-db:/tmp/people_membership.sql && docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/people_membership.sql"

echo "=== [2/3] verify ==="
for fn in gw_mirror_main_membership_to_yodoc gw_can_manage_tenant_roster gw_tenant_roster gw_update_tenant_member; do
  n=$(psql_remote "select count(*) from pg_proc where proname='$fn'" | tr -d '[:space:]')
  [ "$n" -ge 1 ] && echo "  ✓ $fn" || { echo "  ✖ $fn missing" >&2; exit 1; }
done
t=$(psql_remote "select count(*) from pg_trigger where tgname='trg_mirror_main_membership_to_yodoc'" | tr -d '[:space:]')
[ "$t" = "1" ] && echo "  ✓ trigger" || { echo "  ✖ trigger missing" >&2; exit 1; }
echo "  Yo-Doc members by role:"
psql_remote "select m.role||': '||count(*) from gw_tenant_members m join gw_tenants t on t.id=m.tenant_id where t.slug='kevin' group by m.role order by 1" | sed 's/^/    /'

if [ "${1:-}" = "--db-only" ]; then echo "=== done (db only) ==="; exit 0; fi

echo "=== [3/3] deploy web ==="
bash scripts/deploy-frontend.sh
echo "=== done ==="
