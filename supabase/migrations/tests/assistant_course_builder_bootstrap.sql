-- Test scaffolding for the Assistant Course Builder migration test — NOT a
-- migration; supabase/migrations/tests/ is not auto-applied. Bootstraps the
-- minimal preexisting schema (gw_courses, gw_assignments, gw_profiles, etc.
-- predate the migrations dir) on a LOCAL scratch DB only. Never run on prod.
--
-- Deviation from the brief: current_tenant_id() and auth.uid() return a
-- STABLE fixed uuid each (rather than gen_random_uuid() per call). With a
-- fresh random uuid on every call, assistant_create_course()'s course_code
-- de-conflict WHILE loop (which calls current_tenant_id() once per
-- iteration) and its multiple auth.uid()/current_tenant_id() references
-- across separate INSERTs would never agree with each other, and the RPC
-- smoke test's `WHERE id = ...` / tenant lookups would be meaningless. Fixed
-- stand-in identities make the smoke test actually exercise the RPC's logic.
CREATE TABLE IF NOT EXISTS gw_profiles (user_id uuid PRIMARY KEY, full_name text, email text,
  phone text, phone_number text, role text, is_admin boolean DEFAULT false, is_super_admin boolean DEFAULT false);
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::uuid
$$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT '00000000-0000-0000-0000-000000000002'::uuid
$$;
CREATE TABLE IF NOT EXISTS gw_courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code text, code text, title text, description text, semester text,
  instructor_id uuid, instructor_name text, is_active boolean DEFAULT true,
  is_template boolean DEFAULT false, is_free boolean DEFAULT true,
  created_by uuid, tenant_id uuid);
ALTER TABLE gw_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage courses" ON gw_courses FOR ALL USING (true);
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
