-- GleeWorld Planner add-on (module id 'planner', nav label "Notes").
-- NotePlan-inspired notes + tasks + calendar planning, v1 = private
-- workspace vertical slice (Phases 1-3 of the design spec):
-- notes (regular + lazily-created period notes keyed by date_key),
-- nested folders, soft delete + revisions, wiki links/backlinks,
-- inline tasks synchronized with a relational task table, simple
-- recurrence, templates (system-seeded + user), saved filters.
-- Shared spaces / publishing / AI arrive in a later phase with their
-- own tables; nothing here presumes them.
--
-- Every table: tenant_id DEFAULT current_tenant_id() + backfill
-- trigger + RESTRICTIVE isolation policy + owner-only PERMISSIVE
-- policy. Planner content is deliberately NOT admin-readable in v1:
-- it is a personal planning surface, unlike attendance/grades.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- shared tenant-backfill trigger fn: create only if absent
-- (CREATE OR REPLACE fails with "must be owner" on some stacks)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_tenant_id_default' AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.set_tenant_id_default() RETURNS trigger
    LANGUAGE plpgsql SET search_path = public, pg_temp
    AS $fn$
    BEGIN
      IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.current_tenant_id();
      END IF;
      RETURN NEW;
    END
    $fn$;
  END IF;
END $do$;

CREATE OR REPLACE FUNCTION public.gw_planner_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── Folders ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_planner_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.gw_planner_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_planner_folders_owner_idx
  ON public.gw_planner_folders (user_id, parent_id, position);
CREATE INDEX IF NOT EXISTS gw_planner_folders_tenant_idx
  ON public.gw_planner_folders (tenant_id);

-- ── Notes ────────────────────────────────────────────────────────────
-- note_type 'note' = regular/project note; the five period types are
-- created lazily on first open, one per (user, type, date_key).
-- date_key formats: 2026-10-17 / 2026-W42 / 2026-10 / 2026-Q4 / 2026.
-- content       = TipTap document JSON (authoritative editor state)
-- content_text  = plain-text projection (search; trigram-indexed)
-- content_md    = portable Markdown projection (export/interop)
-- entity_type/entity_id = optional typed link to a GleeWorld record
-- (event, concert_program, sheet_music, course, ensemble, member).
CREATE TABLE IF NOT EXISTS public.gw_planner_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.gw_planner_folders(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL DEFAULT 'note'
    CHECK (note_type IN ('note','daily','weekly','monthly','quarterly','yearly')),
  date_key TEXT,
  title TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_text TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planner_period_needs_key
    CHECK (note_type = 'note' OR date_key IS NOT NULL)
);
-- one period note per user per period
CREATE UNIQUE INDEX IF NOT EXISTS gw_planner_notes_period_uq
  ON public.gw_planner_notes (tenant_id, user_id, note_type, date_key)
  WHERE note_type <> 'note';
CREATE INDEX IF NOT EXISTS gw_planner_notes_owner_idx
  ON public.gw_planner_notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gw_planner_notes_folder_idx
  ON public.gw_planner_notes (folder_id);
CREATE INDEX IF NOT EXISTS gw_planner_notes_tenant_idx
  ON public.gw_planner_notes (tenant_id);
CREATE INDEX IF NOT EXISTS gw_planner_notes_title_trgm
  ON public.gw_planner_notes USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gw_planner_notes_text_trgm
  ON public.gw_planner_notes USING gin (content_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gw_planner_notes_tags_idx
  ON public.gw_planner_notes USING gin (tags);

-- ── Note revisions (last 50 per note; pruned by the save API) ───────
CREATE TABLE IF NOT EXISTS public.gw_planner_note_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  note_id UUID NOT NULL REFERENCES public.gw_planner_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL,
  content_md TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_planner_note_revisions_note_idx
  ON public.gw_planner_note_revisions (note_id, version DESC);
CREATE INDEX IF NOT EXISTS gw_planner_note_revisions_tenant_idx
  ON public.gw_planner_note_revisions (tenant_id);

-- ── Note links (rebuilt on save; backlinks = query target_note_id) ──
CREATE TABLE IF NOT EXISTS public.gw_planner_note_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  note_id UUID NOT NULL REFERENCES public.gw_planner_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_note_id UUID REFERENCES public.gw_planner_notes(id) ON DELETE CASCADE,
  target_entity_type TEXT,
  target_entity_id UUID,
  link_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planner_link_has_target
    CHECK (target_note_id IS NOT NULL OR target_entity_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS gw_planner_note_links_source_idx
  ON public.gw_planner_note_links (note_id);
CREATE INDEX IF NOT EXISTS gw_planner_note_links_target_idx
  ON public.gw_planner_note_links (target_note_id);
CREATE INDEX IF NOT EXISTS gw_planner_note_links_tenant_idx
  ON public.gw_planner_note_links (tenant_id);

-- ── Tasks ────────────────────────────────────────────────────────────
-- Tasks are relational rows; a task that lives inside a note carries
-- (note_id, block_id) where block_id is the stable id of the taskItem
-- node in the note's TipTap doc. Deleting the block detaches (not
-- deletes) a scheduled task. recurrence = simple RRULE subset jsonb:
-- {freq: daily|weekly|monthly|yearly, interval, byweekday[], until, count}.
-- Completing a recurring task spawns the next occurrence row with
-- recurrence_parent_id pointing at the series head.
CREATE TABLE IF NOT EXISTS public.gw_planner_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.gw_planner_notes(id) ON DELETE SET NULL,
  block_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','done','cancelled')),
  priority TEXT NOT NULL DEFAULT 'none'
    CHECK (priority IN ('none','low','medium','high','urgent')),
  scheduled_date DATE,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recurrence JSONB,
  recurrence_parent_id UUID REFERENCES public.gw_planner_tasks(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gw_planner_tasks_block_uq
  ON public.gw_planner_tasks (note_id, block_id)
  WHERE note_id IS NOT NULL AND block_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_planner_tasks_owner_sched_idx
  ON public.gw_planner_tasks (user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS gw_planner_tasks_owner_status_idx
  ON public.gw_planner_tasks (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS gw_planner_tasks_note_idx
  ON public.gw_planner_tasks (note_id);
CREATE INDEX IF NOT EXISTS gw_planner_tasks_tenant_idx
  ON public.gw_planner_tasks (tenant_id);

-- ── Templates ────────────────────────────────────────────────────────
-- System templates: is_system = true, tenant_id/user_id NULL, readable
-- by every authenticated user, writable by nobody through the API
-- (no permissive write policy matches them). User templates follow the
-- standard owner + tenant model. tenant_id is nullable here (system
-- rows) so the isolation policy is written accordingly.
CREATE TABLE IF NOT EXISTS public.gw_planner_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID DEFAULT public.current_tenant_id(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  note_type TEXT NOT NULL DEFAULT 'note'
    CHECK (note_type IN ('note','daily','weekly','monthly','quarterly','yearly')),
  content JSONB NOT NULL,
  content_md TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planner_template_ownership
    CHECK (is_system OR (tenant_id IS NOT NULL AND user_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS gw_planner_templates_tenant_idx
  ON public.gw_planner_templates (tenant_id);
-- makes the system-template seed idempotent (ON CONFLICT DO NOTHING)
CREATE UNIQUE INDEX IF NOT EXISTS gw_planner_templates_system_name_uq
  ON public.gw_planner_templates (name) WHERE is_system;

-- ── Saved filters ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_planner_saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_planner_saved_filters_owner_idx
  ON public.gw_planner_saved_filters (user_id, position);
CREATE INDEX IF NOT EXISTS gw_planner_saved_filters_tenant_idx
  ON public.gw_planner_saved_filters (tenant_id);

-- ── tenant backfill + updated_at triggers ────────────────────────────
DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_planner_folders','gw_planner_notes','gw_planner_note_revisions',
    'gw_planner_note_links','gw_planner_tasks','gw_planner_saved_filters'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_tenant_trg ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_tenant_trg BEFORE INSERT ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t, t);
  END LOOP;
  -- templates intentionally excluded: system rows keep tenant_id NULL
  FOREACH t IN ARRAY ARRAY[
    'gw_planner_folders','gw_planner_notes','gw_planner_tasks',
    'gw_planner_templates','gw_planner_saved_filters'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch_trg ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_touch_trg BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.gw_planner_touch()', t, t);
  END LOOP;
END $do$;

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.gw_planner_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_planner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_planner_note_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_planner_note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_planner_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_planner_saved_filters ENABLE ROW LEVEL SECURITY;

DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_planner_folders','gw_planner_notes','gw_planner_note_revisions',
    'gw_planner_note_links','gw_planner_tasks','gw_planner_saved_filters'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_isolation ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_isolation ON public.%I AS RESTRICTIVE
       FOR ALL TO authenticated
       USING (tenant_id = public.current_tenant_id())
       WITH CHECK (tenant_id = public.current_tenant_id())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_owner ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_owner ON public.%I
       FOR ALL TO authenticated
       USING (user_id = auth.uid())
       WITH CHECK (user_id = auth.uid())', t, t);
  END LOOP;
END $do$;

-- Templates: isolation admits system rows (tenant_id NULL, is_system);
-- reads = system + own; writes = own non-system rows only.
DROP POLICY IF EXISTS gw_planner_templates_isolation ON public.gw_planner_templates;
CREATE POLICY gw_planner_templates_isolation ON public.gw_planner_templates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((is_system AND tenant_id IS NULL) OR tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
DROP POLICY IF EXISTS gw_planner_templates_select ON public.gw_planner_templates;
CREATE POLICY gw_planner_templates_select ON public.gw_planner_templates
  FOR SELECT TO authenticated
  USING (is_system OR user_id = auth.uid());
DROP POLICY IF EXISTS gw_planner_templates_insert ON public.gw_planner_templates;
CREATE POLICY gw_planner_templates_insert ON public.gw_planner_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT is_system);
DROP POLICY IF EXISTS gw_planner_templates_update ON public.gw_planner_templates;
CREATE POLICY gw_planner_templates_update ON public.gw_planner_templates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT is_system)
  WITH CHECK (user_id = auth.uid() AND NOT is_system);
DROP POLICY IF EXISTS gw_planner_templates_delete ON public.gw_planner_templates;
CREATE POLICY gw_planner_templates_delete ON public.gw_planner_templates
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT is_system);

-- ── System templates ─────────────────────────────────────────────────
-- Placeholders ({{date}}, {{user_name}}, {{ensemble_name}}, ...) are
-- substituted client-side by an allowlisted expression engine; no code
-- execution. Content is TipTap document JSON.
INSERT INTO public.gw_planner_templates
  (tenant_id, user_id, is_system, name, description, note_type, content, content_md)
VALUES
(NULL, NULL, true, 'Daily plan', 'Structure for a focused day: top priorities, schedule, notes.', 'daily',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Top priorities"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Most important thing today"}]}]},
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Second priority"}]}]}
   ]},
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Notes"}]},
   {"type":"paragraph"}
 ]}'::jsonb,
 E'## Top priorities\n\n- [ ] Most important thing today\n- [ ] Second priority\n\n## Notes\n'),
(NULL, NULL, true, 'Weekly review', 'Look back at the week, carry forward what matters.', 'weekly',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Wins this week"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"What needs attention"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Next week"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}
   ]}
 ]}'::jsonb,
 E'## Wins this week\n\n- \n\n## What needs attention\n\n- \n\n## Next week\n\n- [ ] \n'),
(NULL, NULL, true, 'Rehearsal plan', 'Repertoire goals, warm-ups, timing, and follow-ups for a rehearsal.', 'note',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Rehearsal — {{date}}"}]},
   {"type":"paragraph","content":[{"type":"text","text":"Ensemble: {{ensemble_name}}"}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Warm-up"}]},
   {"type":"paragraph"},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Repertoire goals"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Announcements"}]},
   {"type":"paragraph"},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Follow-ups"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}
   ]}
 ]}'::jsonb,
 E'## Rehearsal — {{date}}\n\nEnsemble: {{ensemble_name}}\n\n### Warm-up\n\n### Repertoire goals\n\n- \n\n### Announcements\n\n### Follow-ups\n\n- [ ] \n'),
(NULL, NULL, true, 'Concert production plan', 'Everything between now and downbeat: program, personnel, logistics, marketing.', 'note',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"{{concert_title}} — {{concert_date}}"}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Program"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Personnel"}]},
   {"type":"paragraph"},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Logistics"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Confirm venue"}]}]},
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Print programs"}]}]}
   ]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Marketing"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}
   ]}
 ]}'::jsonb,
 E'## {{concert_title}} — {{concert_date}}\n\n### Program\n\n- \n\n### Personnel\n\n### Logistics\n\n- [ ] Confirm venue\n- [ ] Print programs\n\n### Marketing\n\n- [ ] \n'),
(NULL, NULL, true, 'Meeting minutes', 'Attendees, decisions, and action items.', 'note',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Meeting — {{date}}"}]},
   {"type":"paragraph","content":[{"type":"text","text":"Attendees: "}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Agenda"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Decisions"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Action items"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}
   ]}
 ]}'::jsonb,
 E'## Meeting — {{date}}\n\nAttendees: \n\n### Agenda\n\n- \n\n### Decisions\n\n- \n\n### Action items\n\n- [ ] \n'),
(NULL, NULL, true, 'Sectional rehearsal', 'Focused plan for one section: goals, trouble spots, assignments.', 'note',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Sectional — {{date}}"}]},
   {"type":"paragraph","content":[{"type":"text","text":"Section: "}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Goals"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Trouble spots (measure numbers)"}]},
   {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Practice assignments"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}
   ]}
 ]}'::jsonb,
 E'## Sectional — {{date}}\n\nSection: \n\n### Goals\n\n- \n\n### Trouble spots (measure numbers)\n\n- \n\n### Practice assignments\n\n- [ ] \n')
ON CONFLICT DO NOTHING;

-- ── Billing catalog row ($0 while add-on billing is disengaged; see
-- 20260710190000_addons_free_until_billing_launch.sql) ───────────────
INSERT INTO public.gw_billing_modules
  (id, name, description, tier, category, icon, monthly_price_cents, is_active, sort_order)
VALUES (
  'planner',
  'Notes',
  'Notes, tasks, and daily planning built for directors and students: daily/weekly notes, rehearsal and concert plans, linked notes, tags, templates, and a kanban board.',
  'addon',
  'calendar',
  'NotebookPen',
  0,
  true,
  72
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
