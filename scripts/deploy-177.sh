#!/usr/bin/env bash
# One-shot deploy for PR #177 (AI quiz generation): migration + edge fns + web.
# Safe: verifies gw_course_tests.tenant_id exists BEFORE applying (the new RPC
# depends on it); migration runs in a single transaction (auto-rollback on
# error); web rsync never uses --delete. Stops at the first failure.
set -euo pipefail

REPO="/Users/kevinjohnson/Documents/GitHub/gleeworld"
DROPLET="root@198.211.113.144"
MIG="20260714210000_assistant_create_course_quizzes.sql"
cd "$REPO"

if [ ! -f dist/index.html ]; then echo "✖ dist/ not built — run 'npx vite build' first." >&2; exit 1; fi

echo "=== [1/4] preflight: gw_course_tests.tenant_id must exist ==="
HAS_TENANT=$(ssh "$DROPLET" "docker exec supabase-db psql -U postgres -d postgres -tAc \"select 1 from information_schema.columns where table_name='gw_course_tests' and column_name='tenant_id'\"" | tr -d '[:space:]')
if [ "$HAS_TENANT" != "1" ]; then
  echo "✖ gw_course_tests has NO tenant_id column — the quiz RPC would fail. STOPPING." >&2
  echo "  (Tell Claude; we'll add the column first, then re-run.)" >&2
  exit 1
fi
echo "  ✓ tenant_id present"

echo "=== [2/4] apply migration (single transaction) ==="
scp "supabase/migrations/$MIG" "$DROPLET:/tmp/mq.sql"
ssh "$DROPLET" "docker cp /tmp/mq.sql supabase-db:/tmp/mq.sql && docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction -f /tmp/mq.sql"
echo "  verify function + new policy:"
ssh "$DROPLET" "docker exec supabase-db psql -U postgres -d postgres -tAc \"select proname from pg_proc where proname='assistant_create_course'\"; docker exec supabase-db psql -U postgres -d postgres -tAc \"select policyname from pg_policies where tablename='gw_course_tests' and policyname='Course editors can manage tests'\""

echo "=== [3/4] deploy edge functions ==="
rsync -az --exclude='__tests__' supabase/functions/_shared/ "$DROPLET:/opt/supabase/volumes/functions/_shared/"
rsync -az --exclude='__tests__' supabase/functions/generate-course-draft/ "$DROPLET:/opt/supabase/volumes/functions/generate-course-draft/"
ssh "$DROPLET" "cd /opt/supabase && docker compose up -d --force-recreate functions"
sleep 6
echo "  boot log (want 'main function started', no import errors):"
ssh "$DROPLET" "docker logs supabase-edge-functions --since 40s 2>&1 | tail -12"

echo "=== [4/4] deploy web (no --delete) ==="
rsync -az --progress dist/ "$DROPLET:/var/www/gleeworld/html/"
ssh "$DROPLET" "ls /var/www/gleeworld/html/tenants/ >/dev/null && echo '  ✓ tenants intact'"

echo "=== DONE — PR #177 deployed ==="
