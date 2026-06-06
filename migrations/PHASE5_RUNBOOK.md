# Phase 5 Runbook — Cut over from hosted to self-hosted Supabase

**Updated:** 2026-06-02 after pre-flight P0–P5 + dead-table drop complete.
**Total downtime budget:** 30–60 minutes
**Risk level:** medium (data move proven on scratch DB)
**Rollback window:** 30 days (keep hosted alive)

---

## Pre-flight status — ALL DONE

| Step | Status | Output |
|---|---|---|
| P0 verify self-hosted | ✓ | 24 containers up, 308 RLS policies, hook fn installed |
| P1 self-hosted snapshot | ✓ | `/root/selfhost-pre-cutover-20260602-2049.sql` (88 MB) |
| P2 hosted backup | (do via dashboard before window) | https://supabase.com/dashboard/project/oopmlreysjzuxzylyheb/database/backups |
| P3 dry-run dump+restore | ✓ clean | 0 non-noise errors in scratch |
| P4 storage byte sync (hosted → DO Spaces) | ✓ | 136 files / 2.06 GiB copied. DO Spaces 8.38 GB ≈ hosted 8.37 GB |
| P5 edge functions deployed to self-hosted | ✓ | 218 functions in /opt/supabase/volumes/functions/ |
| Dead-table drop on hosted | ✓ | 74 tables dropped. Hosted public 606→532. Backup at `/root/dead-tables-backup-20260603-0131.sql` |
| Schema sync hosted → self-hosted | ✓ | 221 missing non-gw tables + 2 missing gw tables added |
| Phase 1+2 multi-tenant (extended) | ✓ | 586 tables with tenant_id, 587 with RESTRICTIVE RLS, 20 globals |
| Phase 3 JWT tenant claim | ✓ | GoTrue access-token hook live |
| Phase 4 storage RLS | ✓ | tenant_id on storage.objects + .buckets, INSERT trigger |

**Outstanding:**
- Take hosted backup via Supabase dashboard (P2) — recommended just before window
- Schedule the maintenance window

---

## Maintenance window (~30–60 min downtime)

### M0. Announce
Update gleeworld.org with a maintenance banner 24h in advance. At window start, optionally swap nginx root to a maintenance page (or accept the SPA staying up briefly read-only).

### M1. Freeze writes on hosted
Run at https://supabase.com/dashboard/project/oopmlreysjzuxzylyheb/sql:
```sql
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage FROM authenticated, anon;
```
Rollback: `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;`

### M2. Final delta sync of hosted storage → DO Spaces
```bash
ssh root@198.211.113.144 "rclone copy supa: doSpaces:glee-world --update --transfers 16 --stats-one-line"
```
**Use `copy` not `sync`** — `sync` would delete self-hosted's own `stub/` prefixed files.

### M3. Final data-only dump of hosted DB
```bash
ssh root@198.211.113.144 'docker exec -e PGPASSWORD="F3xeg1sIuwHACdRk" supabase-db pg_dump \
  "postgresql://postgres.oopmlreysjzuxzylyheb@aws-0-us-east-2.pooler.supabase.com:5432/postgres" \
  --data-only --schema=public --schema=auth --schema=storage \
  --no-owner --no-privileges --disable-triggers \
  --exclude-table=auth.audit_log_entries \
  --exclude-table=auth.flow_state \
  --exclude-table=auth.refresh_tokens \
  --exclude-table=auth.sessions \
  --exclude-table=auth.schema_migrations \
  --exclude-table=auth.instances \
  --exclude-table=auth.custom_oauth_providers \
  --exclude-table=auth.webauthn_challenges \
  --exclude-table=auth.webauthn_credentials \
  --exclude-table=auth.oauth_authorizations \
  --exclude-table=auth.oauth_client_states \
  --exclude-table=auth.oauth_clients \
  --exclude-table=auth.oauth_consents \
  --exclude-table=storage.schema_migrations \
  -f /tmp/hosted-final.sql'
```

### M4. Wipe drifted self-hosted state
```bash
ssh root@198.211.113.144 'docker exec supabase-db psql -U supabase_admin -d postgres <<SQL
BEGIN;
SET session_replication_role = "replica";

-- Wipe all public tables EXCEPT tenant registry + platform globals
DO \$\$
DECLARE tbl text;
  keep text[] := ARRAY[
    "gw_tenants","gw_tenant_members",
    "gw_feature_flags","gw_app_functions",
    "gw_permissions","gw_roles","gw_tax_regions","gw_webhook_events",
    "app_roles","user_roles","user_roles_multi",
    "permission_groups","permission_group_permissions","user_permission_groups",
    "username_permissions","username_module_permissions",
    "theme_templates","rate_limits","security_rate_limits",
    "notification_sounds","usccb_readings"
  ];
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname="public" AND NOT (tablename = ANY(keep))
  LOOP
    EXECUTE format("TRUNCATE TABLE public.%I CASCADE", tbl);
  END LOOP;
END \$\$;

TRUNCATE storage.objects CASCADE;
TRUNCATE storage.buckets CASCADE;
TRUNCATE auth.users CASCADE;
COMMIT;
SQL'
```

### M5. Restore hosted dump into self-hosted
```bash
ssh root@198.211.113.144 'docker exec supabase-db psql -U supabase_admin -d postgres -f /tmp/hosted-final.sql > /tmp/restore.log 2>&1; grep -cE "ERROR|error:" /tmp/restore.log'
```
Expect 0 non-noise errors (proven in dry-run). If errors > 0, inspect `/tmp/restore.log` before continuing.

### M6. Backfill tenant_id + rebuild gw_tenant_members
```bash
ssh root@198.211.113.144 'docker exec supabase-db psql -U supabase_admin -d postgres <<SQL
BEGIN;
DO \$\$
DECLARE tbl text; spelman_id uuid;
  keep text[] := ARRAY[
    "gw_tenants","gw_tenant_members","gw_feature_flags","gw_app_functions",
    "gw_permissions","gw_roles","gw_tax_regions","gw_webhook_events",
    "app_roles","user_roles","user_roles_multi","permission_groups",
    "permission_group_permissions","user_permission_groups",
    "username_permissions","username_module_permissions","theme_templates",
    "rate_limits","security_rate_limits","notification_sounds","usccb_readings"
  ];
BEGIN
  SELECT id INTO spelman_id FROM public.gw_tenants WHERE slug="spelman";
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname="public" AND NOT (tablename = ANY(keep))
  LOOP
    EXECUTE format("UPDATE public.%I SET tenant_id=%L WHERE tenant_id IS NULL", tbl, spelman_id);
  END LOOP;
  UPDATE storage.objects SET tenant_id=spelman_id WHERE tenant_id IS NULL;
  UPDATE storage.buckets SET tenant_id=spelman_id WHERE tenant_id IS NULL;
END \$\$;

-- Rebuild gw_tenant_members from restored auth.users
INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT u.id, t.id,
       CASE WHEN u.is_super_admin THEN "super_admin" ELSE "member" END
FROM auth.users u
CROSS JOIN public.gw_tenants t
WHERE t.slug="spelman"
ON CONFLICT DO NOTHING;

SET session_replication_role = "origin";
COMMIT;
SQL'
```

### M7. Verification before flipping traffic
```bash
ssh root@198.211.113.144 'docker exec supabase-db psql -U supabase_admin -d postgres -At -c "
  SELECT \"auth.users: \" || COUNT(*) FROM auth.users
  UNION ALL SELECT \"gw_courses: \" || COUNT(*) FROM gw_courses
  UNION ALL SELECT \"gw_profiles: \" || COUNT(*) FROM gw_profiles
  UNION ALL SELECT \"contracts_v2: \" || COUNT(*) FROM contracts_v2
  UNION ALL SELECT \"finance_records: \" || COUNT(*) FROM finance_records
  UNION ALL SELECT \"mus240_journal_entries: \" || COUNT(*) FROM mus240_journal_entries
  UNION ALL SELECT \"w9_forms: \" || COUNT(*) FROM w9_forms
  UNION ALL SELECT \"storage.objects: \" || COUNT(*) FROM storage.objects
  UNION ALL SELECT \"gw_tenant_members: \" || COUNT(*) FROM gw_tenant_members
  UNION ALL SELECT \"null_tenant_in_courses: \" || COUNT(*) FROM gw_courses WHERE tenant_id IS NULL
;"'
```
**Expected (matches hosted snapshot at dry-run time):**
- auth.users: 868
- gw_courses: 7
- gw_profiles: 851
- contracts_v2: 65
- finance_records: 85
- mus240_journal_entries: 286
- w9_forms: 44
- storage.objects: 2184
- gw_tenant_members: 868
- null_tenant_in_courses: 0

### M8. Deploy real tenant-bootstrap.js
```bash
ssh root@198.211.113.144 "cat > /var/www/gleeworld/html/tenant-bootstrap.js <<'JS'
window.__TENANT_CONFIG__ = {
  tenant: 'spelman',
  supabaseUrl: 'https://supabase.gleeworld.org',
  supabaseAnonKey: 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3ODAxNzEwNzcsICJleHAiOiAyMDk1NTMxMDc3fQ.orWLkajK-mQywKVcWS48HVXU8uKWtsL6iY5BAaVn0xc'
};
JS"
```

Bump SW version + rebuild:
```bash
cd /tmp/gleeworld
sed -i '' "s/CACHE_VERSION = 'v20.9'/CACHE_VERSION = 'v21.0'/" public/sw.js
npm run build
# CRITICAL: rsync must NOT overwrite tenant-bootstrap.js. Use --exclude:
rsync -az --exclude=tenant-bootstrap.js dist/ root@198.211.113.144:/var/www/gleeworld/html/
```

### M9. Lift maintenance + smoke tests
Visit https://gleeworld.org in incognito:
- [ ] Page loads
- [ ] DevTools Network → ALL requests to `/rest/*` `/auth/*` `/storage/*` hit `supabase.gleeworld.org` (NOT `oopmlreysjzuxzylyheb.supabase.co`)
- [ ] Sign in works (passwords carry over via bcrypt hash migration)
- [ ] Courses load on dashboard
- [ ] Open a course → assignments, members, attendance visible
- [ ] Upload a small file → goes to DO Spaces, appears in app
- [ ] Decode JWT in localStorage `sb-...-auth-token` → payload contains `tenant_id` + `tenant_slug: spelman`

If any check fails → rollback (below).

### M10. Re-enable hosted writes (rollback safety net)
At https://supabase.com/dashboard/project/oopmlreysjzuxzylyheb/sql:
```sql
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO authenticated, anon;
```
Hosted now writable for emergency rollback, but no live traffic should hit it.

---

## Rollback (if M9 smoke tests fail)

```bash
ssh root@198.211.113.144 "cat > /var/www/gleeworld/html/tenant-bootstrap.js <<'JS'
window.__TENANT_CONFIG__ = window.__TENANT_CONFIG__ || null;
JS"
# Optional: bump SW one more time to force clients to fetch the reverted bootstrap
```
Site falls back to hosted within ~5 min (sooner if you bump SW). Any user actions during the failed window will need manual replay if they hit self-hosted before the revert.

---

## Post-cutover (next 30 days)

- **Day 1–7:** monitor `docker logs supabase-auth -f` + `supabase-rest` for unexpected 5xx, watch user complaint channels.
- **Day 7:** re-freeze hosted writes (`REVOKE`) so accidental writes can't go there. Hosted DB stays around as read-only fallback.
- **Day 30:** if stable, cancel hosted Pro plan at https://supabase.com/dashboard/project/oopmlreysjzuxzylyheb/settings/billing. Delete the project. Update `reference_gleeworld.md` to mark cutover complete.
- **Day 30+:** rip out the hardcoded `oopmlreysjzuxzylyheb` fallback in `src/integrations/supabase/client.ts:26` (no longer a real DB to fall back to).

---

## What this runbook does NOT cover

- **ggsi.gleeworld.org** subdomain — currently 404 on tenant-bootstrap.js → falls through to hosted. Will need its own tenant in the same self-hosted DB, plus a tenant-bootstrap.js per subdomain. Handle after Spelman cutover is stable.
- **Stripe provisioning rewrite** — `scripts/stripe-provision-webhook/server.js` currently spins per-tenant docker stacks. After cutover, change it to INSERT into `gw_tenants` instead. Marginal cost per new tenant: ~$0.
- **Spelman branding in code** — separate workstream. The platform identity is GleeWorld; per-tenant copy lives in `gw_branding_settings`. Replace hardcoded "Spelman" in `index.html`, `public/manifest.json`, About/Landing pages, etc. — see `feedback_gleeworld_tenant_neutral.md`.
- **Edge function `soundcloud-tracks`** is unmigratable (bundle fails on hosted). Admin SoundCloud feature has been silently broken. Rebuild if needed.
