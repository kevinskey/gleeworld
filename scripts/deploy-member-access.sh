#!/usr/bin/env bash
# One-shot deploy for member access (docs/reference/member-access.md):
#   1. apply 20261031120000 (GleeWorld members mirrored into Yo-Doc; People
#      page by membership) and 20261101120000 (member access defined in one
#      place) on the self-hosted DB — both are safe to re-run
#   2. verify every function + the trigger exist, print members by workspace
#   3. run the member access SQL test (rolls itself back)
#   4. deploy the web frontend (Share dialog lists members)
#
# Run from a machine that holds the droplet SSH key:
#   bash scripts/deploy-member-access.sh
#   bash scripts/deploy-member-access.sh --db-only     # skip the web deploy
#
# The migration files carry their own BEGIN/COMMIT, so psql is NOT given
# --single-transaction (that would nest and warn). ON_ERROR_STOP makes a
# failure inside a block roll that block back.
set -euo pipefail

DROPLET="root@198.211.113.144"
MIGRATIONS=(
  "supabase/migrations/20261031120000_mirror_main_members_into_yodoc.sql"
  "supabase/migrations/20261101120000_member_access.sql"
)
TEST="supabase/migrations/tests/member_access_test.sql"
cd "$(dirname "$0")/.."

for f in "${MIGRATIONS[@]}" "$TEST"; do
  [ -f "$f" ] || { echo "✖ $f not found — are you on main and pulled?" >&2; exit 1; }
done

psql_remote() { ssh "$DROPLET" "docker exec supabase-db psql -U postgres -d postgres -tAc \"$1\""; }
psql_file_remote() {
  local f="$1" name; name="$(basename "$f")"
  scp -q "$f" "$DROPLET:/tmp/$name"
  ssh "$DROPLET" "docker cp /tmp/$name supabase-db:/tmp/$name && docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/$name"
}

echo "=== [1/4] apply migrations ==="
for f in "${MIGRATIONS[@]}"; do
  echo "--- $(basename "$f")"
  psql_file_remote "$f"
done

echo "=== [2/4] verify ==="
for fn in gw_mirror_main_membership_to_yodoc gw_tenant_roster gw_update_tenant_member \
          gw_is_member gw_member_role gw_share_reaches_me gw_jukebox_playlist_visible \
          gw_can_share_here gw_share_people gw_my_access; do
  n=$(psql_remote "select count(*) from pg_proc where proname='$fn'" | tr -d '[:space:]')
  [ "$n" -ge 1 ] && echo "  ✓ $fn" || { echo "  ✖ $fn missing" >&2; exit 1; }
done
t=$(psql_remote "select count(*) from pg_trigger where tgname='trg_mirror_main_membership_to_yodoc'" | tr -d '[:space:]')
[ "$t" = "1" ] && echo "  ✓ trigger" || { echo "  ✖ trigger missing" >&2; exit 1; }
v=$(psql_remote "select count(*) from pg_views where viewname='gw_sheet_music_browse'" | tr -d '[:space:]')
[ "$v" = "1" ] && echo "  ✓ gw_sheet_music_browse" || { echo "  ✖ gw_sheet_music_browse missing" >&2; exit 1; }
echo "  Members by workspace and role:"
psql_remote "select t.slug||' / '||m.role||': '||count(*) from gw_tenant_members m join gw_tenants t on t.id=m.tenant_id group by t.slug, m.role order by 1" | sed 's/^/    /'

echo "=== [3/4] member access test ==="
psql_file_remote "$TEST"

if [ "${1:-}" = "--db-only" ]; then echo "=== done (db only) ==="; exit 0; fi

echo "=== [4/4] deploy web ==="
bash scripts/deploy-frontend.sh
echo "=== done ==="
