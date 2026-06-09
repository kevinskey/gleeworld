-- Program Health module — Phase 0 (additive, per-tenant + per-ensemble)
--
-- Adds the ensemble concept (none existed before — gw_groups is study-groups,
-- gw_courses is academic, gw_tour_roster is touring-only) plus the four new
-- tables the Program Health module needs: ensembles, ensemble members,
-- section targets, health snapshots, action plans. Touches existing tables
-- only with ADD COLUMN IF NOT EXISTS — never rewrites.
--
-- Module gated behind feature.program_health; AI piece behind feature.health_ai.
-- Both default off.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Ensembles — the unit a stability score covers.
-- A single tenant (client) can run multiple ensembles (Glee Club, Chamber
-- Singers, etc.). Directors are a join table (an ensemble may have several).
-- course_id is an optional link if the ensemble corresponds to an academic
-- class; community choirs leave it NULL.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_ensembles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  course_id   uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gw_ensembles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active ensembles"
  ON public.gw_ensembles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage ensembles"
  ON public.gw_ensembles FOR ALL
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Director assignments — multiple directors per ensemble allowed.
-- is_primary lets a tenant flag the lead director if they want; not required.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_ensemble_directors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id uuid NOT NULL REFERENCES public.gw_ensembles(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.gw_profiles(id)  ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ensemble_id, profile_id)
);
ALTER TABLE public.gw_ensemble_directors ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gw_ensemble_directors_ensemble ON public.gw_ensemble_directors(ensemble_id);
CREATE INDEX idx_gw_ensemble_directors_profile  ON public.gw_ensemble_directors(profile_id);

CREATE POLICY "Members can see director assignments"
  ON public.gw_ensemble_directors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage director assignments"
  ON public.gw_ensemble_directors FOR ALL
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Ensemble membership — many-to-many with gw_profiles.
-- A person can be in multiple ensembles. Per-ensemble status is independent
-- of the program-wide gw_profiles.status.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_ensemble_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id uuid NOT NULL REFERENCES public.gw_ensembles(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.gw_profiles(id)  ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','prospect','inactive','dropped')),
  joined_on   date NOT NULL DEFAULT CURRENT_DATE,
  left_on     date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ensemble_id, profile_id)
);
ALTER TABLE public.gw_ensemble_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gw_ensemble_members_ensemble ON public.gw_ensemble_members(ensemble_id);
CREATE INDEX idx_gw_ensemble_members_profile  ON public.gw_ensemble_members(profile_id);
CREATE INDEX idx_gw_ensemble_members_status   ON public.gw_ensemble_members(ensemble_id, status);

CREATE POLICY "Members can see their own ensemble memberships"
  ON public.gw_ensemble_members FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.gw_profiles WHERE user_id = auth.uid())
    OR is_admin(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage ensemble memberships"
  ON public.gw_ensemble_members FOR ALL
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Events get an optional ensemble link.
-- NULL = program-wide event (open to whole tenant). Non-NULL = ensemble-scoped.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gw_events
  ADD COLUMN IF NOT EXISTS ensemble_id uuid REFERENCES public.gw_ensembles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_gw_events_ensemble ON public.gw_events(ensemble_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Contact-staleness signal — fuels the "specific members about to walk"
-- flag. Updated whenever a director records a member touchpoint via the
-- existing gw_member_communications / gw_member_care_records flows.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gw_profiles
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Section targets per ensemble.
-- voice_part values must match gw_profiles.voice_part (the granular form:
-- 'soprano_1', 'soprano_2', 'alto_1', etc. — voice parts ARE the sections).
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_section_targets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id  uuid NOT NULL REFERENCES public.gw_ensembles(id) ON DELETE CASCADE,
  voice_part   text NOT NULL,
  target_count int  NOT NULL CHECK (target_count >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ensemble_id, voice_part)
);
ALTER TABLE public.gw_section_targets ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gw_section_targets_ensemble ON public.gw_section_targets(ensemble_id);

CREATE POLICY "Members can view section targets"
  ON public.gw_section_targets FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage section targets"
  ON public.gw_section_targets FOR ALL
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Health snapshots — computed nightly per ensemble, kept as history so the
-- dashboard can show trend lines. weights_version stamps which scoring
-- weights produced the score, so we can re-tune without invalidating history.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_health_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id         uuid NOT NULL REFERENCES public.gw_ensembles(id) ON DELETE CASCADE,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  attendance_rate_30d numeric(5,2),
  attendance_delta    numeric(5,2),
  retention_rate      numeric(5,2),
  thin_sections       jsonb,
  readiness_gap_days  int,
  stability_score     int CHECK (stability_score BETWEEN 0 AND 100),
  flags               jsonb,
  weights_version     text
);
ALTER TABLE public.gw_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gw_health_snapshots_ensemble_time
  ON public.gw_health_snapshots(ensemble_id, computed_at DESC);

CREATE POLICY "Admins can read health snapshots"
  ON public.gw_health_snapshots FOR SELECT
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can write health snapshots"
  ON public.gw_health_snapshots FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Action plans — Claude-generated 30-day plans, one row per generation.
-- input_context is the director's free-text constraints fed to the model.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_action_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id   uuid NOT NULL REFERENCES public.gw_ensembles(id) ON DELETE CASCADE,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  model         text,
  input_context text,
  plan          jsonb NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','archived'))
);
ALTER TABLE public.gw_action_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gw_action_plans_ensemble_time
  ON public.gw_action_plans(ensemble_id, generated_at DESC);

CREATE POLICY "Admins can read action plans"
  ON public.gw_action_plans FOR SELECT
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can write action plans"
  ON public.gw_action_plans FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Feature flags (uses existing gw_feature_flags).
-- Both default OFF so this migration ships dark.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_feature_flags (flag_key, is_enabled, description)
VALUES
  ('program_health', false, 'Program Health module — stability score, flags, dashboard'),
  ('health_ai',      false, 'AI-generated 30-day action plans (Anthropic)')
ON CONFLICT (flag_key) DO NOTHING;
