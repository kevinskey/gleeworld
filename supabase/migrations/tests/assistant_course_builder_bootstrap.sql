-- Test scaffolding for the Assistant Course Builder migration test — NOT a
-- migration; supabase/migrations/tests/ is not auto-applied. Bootstraps the
-- minimal preexisting schema (gw_courses, gw_assignments, gw_profiles, etc.
-- predate the migrations dir) on a LOCAL scratch DB only. Never run on prod.
--
-- Deviations from the brief's literal bootstrap block (intentional):
-- 1. auth.uid() reads the transaction-local GUC "test.uid" instead of
--    gen_random_uuid(), so tests can switch identities AND every call within a
--    statement agrees with the others (assistant_create_course calls auth.uid()
--    and current_tenant_id() several times; per-call random uuids would make
--    the course-code de-conflict loop and row-visibility checks meaningless).
--    current_tenant_id() returns a fixed uuid for the same reason.
-- 2. RLS is ENABLED on all stand-in tables and the policies mirror the REAL
--    prod policy shapes (grepped from migration history), including the leaky
--    20251203 "Authenticated users can view courses" USING (true) policy that
--    the migration must drop — so the test genuinely proves the migration's
--    RLS behavior instead of exercising owner-bypass.
-- 3. A non-owner role gw_test_authenticated (member of authenticated) exists
--    so the test can run the RPC with RLS actually enforced; table owners
--    bypass RLS and prove nothing.

-- Identity stand-ins ---------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::uuid
$$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('test.uid', true), '')::uuid
$$;

-- Roles (cluster-wide; created only if missing) ------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gw_test_authenticated') THEN
    CREATE ROLE gw_test_authenticated NOLOGIN;
  END IF;
END $$;
GRANT authenticated TO gw_test_authenticated;

-- Stand-in tables -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gw_profiles (user_id uuid PRIMARY KEY, full_name text, email text,
  phone text, phone_number text, role text, is_admin boolean DEFAULT false, is_super_admin boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS gw_courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code text, code text, title text, description text, semester text,
  instructor_id uuid, instructor_name text, is_active boolean DEFAULT true,
  is_template boolean DEFAULT false, is_free boolean DEFAULT true,
  created_by uuid, tenant_id uuid);
CREATE TABLE IF NOT EXISTS gw_course_modules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, module_id text, title text, description text, week_number int,
  is_active boolean, is_locked boolean, display_order int, learning_objectives jsonb);
CREATE TABLE IF NOT EXISTS gw_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, instructions text, assignment_type text,
  category text, points int, due_at timestamptz, is_active boolean, created_by uuid, tenant_id uuid);
CREATE TABLE IF NOT EXISTS gw_course_rubrics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, is_default boolean, created_by uuid);
CREATE TABLE IF NOT EXISTS gw_rubric_criteria (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid, criterion_name text, description text, max_points int,
  weight_percentage numeric, display_order int);
CREATE TABLE IF NOT EXISTS gw_course_class_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, session_date date, start_time time, end_time time,
  location text, session_type text, attendance_required boolean, created_by uuid);
CREATE TABLE IF NOT EXISTS gw_course_playlists (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, is_public boolean, is_featured boolean,
  display_order int, created_by uuid);

-- RLS on every table the migration/RPC touches --------------------------------
ALTER TABLE gw_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_course_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_course_class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_course_playlists ENABLE ROW LEVEL SECURITY;

-- Prod-shaped policies (mirroring the real migration history) -----------------
-- gw_courses (20251203192132 + 20251215134319)
CREATE POLICY "Authenticated users can view courses" ON gw_courses
  FOR SELECT TO authenticated USING (true);  -- the leak the migration must drop
CREATE POLICY "Anyone can view active courses" ON gw_courses
  FOR SELECT USING (is_active = true OR is_active IS NULL);  -- migration replaces
CREATE POLICY "Admins can manage courses" ON gw_courses
  FOR ALL USING (EXISTS (SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)));
CREATE POLICY "Admins can insert courses" ON gw_courses
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)));
-- gw_course_modules (20260121031356)
CREATE POLICY "Anyone can view active modules" ON gw_course_modules
  FOR SELECT USING (true);
CREATE POLICY "Instructors can manage modules" ON gw_course_modules
  FOR ALL USING (EXISTS (SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid() AND role IN ('admin','super-admin','instructor')));
-- gw_assignments (20251115025437)
CREATE POLICY "Instructors can create assignments" ON gw_assignments
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM gw_profiles
    WHERE role IN ('instructor','admin','super_admin') OR is_admin = true OR is_super_admin = true));
-- gw_course_rubrics (20251215134319) — note prod's manage policy is admin-flag
-- only; the migration re-points it at is_course_editor()
CREATE POLICY "Anyone can view rubrics" ON gw_course_rubrics FOR SELECT USING (true);
CREATE POLICY "Admins can manage rubrics" ON gw_course_rubrics
  FOR ALL USING (EXISTS (SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)));
-- gw_rubric_criteria (20251215134319) — SELECT-only in prod; migration adds writes
CREATE POLICY "Anyone can view rubric criteria" ON gw_rubric_criteria FOR SELECT USING (true);
-- gw_course_class_sessions (20260107205754)
CREATE POLICY "Anyone can view class sessions" ON gw_course_class_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create class sessions" ON gw_course_class_sessions
  FOR INSERT TO authenticated WITH CHECK (true);
-- gw_course_playlists (20251219005230)
CREATE POLICY "Admins manage playlists" ON gw_course_playlists
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)));

-- Grants so the non-owner role can reach the tables (RLS still applies) --------
GRANT USAGE ON SCHEMA public TO gw_test_authenticated;
GRANT USAGE ON SCHEMA auth TO gw_test_authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gw_test_authenticated;

-- Seed identities --------------------------------------------------------------
INSERT INTO gw_profiles (user_id, full_name, role, is_admin, is_super_admin) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Test Instructor', 'instructor', false, false),
  ('00000000-0000-0000-0000-000000000003', 'Test Student', 'student', false, false)
ON CONFLICT (user_id) DO NOTHING;
