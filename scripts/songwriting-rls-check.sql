-- Songwriting RLS smoke checks. Run as postgres on the droplet:
--   docker exec -i supabase-db psql -U postgres -d postgres < scripts/songwriting-rls-check.sql
-- Every SELECT must return the commented expectation.

-- 1. RLS is enabled on all three tables (expect 3 rows, all 't')
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('gw_songs','gw_song_recordings','gw_songwriting_ai_logs');

-- 2. RESTRICTIVE tenant policy exists on all three (expect 3 rows)
SELECT tablename, policyname FROM pg_policies
WHERE policyname = 'tenant_isolation_restrict'
  AND tablename IN ('gw_songs','gw_song_recordings','gw_songwriting_ai_logs');

-- 3. Catalog row present and dark (expect 1 row, stripe_price_id IS NULL)
SELECT id, tier, monthly_price_cents, stripe_price_id, is_active
FROM gw_billing_modules WHERE id = 'songwriting';

-- 4. Bucket exists and is private (expect public = false)
SELECT id, public FROM storage.buckets WHERE id = 'songwriting';

-- 5. Cross-user leak check: simulate two users in one tenant.
--    A private song must be invisible to the second user; a shared one visible.
BEGIN;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000aa","tenant_id":"00000000-0000-0000-0000-00000000dead","role":"authenticated"}';
SET LOCAL role = authenticated;
-- (uses current_tenant_id() from the claim; inserts as user aa)
INSERT INTO gw_songs (user_id, title) VALUES ('00000000-0000-0000-0000-0000000000aa','rls probe private');
INSERT INTO gw_songs (user_id, title, visibility) VALUES ('00000000-0000-0000-0000-0000000000aa','rls probe shared','tenant');
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000bb","tenant_id":"00000000-0000-0000-0000-00000000dead","role":"authenticated"}';
-- expect exactly 1 row (the shared one)
SELECT title FROM gw_songs WHERE title LIKE 'rls probe%';
ROLLBACK;
