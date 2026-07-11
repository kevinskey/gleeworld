-- supabase/migrations/tests/planner_module_test.sql
-- Run against a DB with 20260711120000_planner_module.sql applied.
-- Asserts tenant plumbing, RLS shape, constraints, and seeds.
BEGIN;

-- every planner table exists, has RLS enabled, tenant default, backfill
-- trigger bound to set_tenant_id_default, RESTRICTIVE isolation policy,
-- and a PERMISSIVE owner policy
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_planner_folders','gw_planner_notes','gw_planner_note_revisions',
    'gw_planner_note_links','gw_planner_tasks','gw_planner_saved_filters'
  ] LOOP
    ASSERT (SELECT count(*) = 1 FROM information_schema.tables
            WHERE table_name = t), t || ' missing';
    ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = t),
           t || ': RLS not enabled';
    ASSERT (SELECT column_default LIKE '%current_tenant_id%'
            FROM information_schema.columns
            WHERE table_name = t AND column_name = 'tenant_id'),
           t || ': tenant_id default not current_tenant_id()';
    ASSERT (SELECT count(*) >= 1 FROM information_schema.triggers
            WHERE event_object_table = t
              AND action_timing = 'BEFORE' AND event_manipulation = 'INSERT'
              AND action_statement ILIKE '%set_tenant_id_default%'),
           t || ': tenant backfill trigger missing';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE tablename = t AND policyname = t || '_isolation'
              AND permissive = 'RESTRICTIVE'),
           t || ': RESTRICTIVE isolation policy missing';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE tablename = t AND policyname = t || '_owner'
              AND permissive = 'PERMISSIVE'),
           t || ': PERMISSIVE owner policy missing';
  END LOOP;
END $$;

-- templates: RLS on, isolation admits NULL-tenant system rows only via
-- is_system, write policies exclude system rows
DO $$ BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'gw_planner_templates'),
         'templates: RLS not enabled';
  ASSERT (SELECT count(*) = 1 FROM pg_policies
          WHERE tablename = 'gw_planner_templates'
            AND policyname = 'gw_planner_templates_isolation'
            AND permissive = 'RESTRICTIVE'),
         'templates: RESTRICTIVE isolation policy missing';
  ASSERT (SELECT count(*) = 4 FROM pg_policies
          WHERE tablename = 'gw_planner_templates' AND permissive = 'PERMISSIVE'),
         'templates: expected 4 permissive policies (select/insert/update/delete)';
  ASSERT (SELECT qual ILIKE '%is_system%' FROM pg_policies
          WHERE tablename = 'gw_planner_templates'
            AND policyname = 'gw_planner_templates_select'),
         'templates: select policy must admit system templates';
END $$;

-- period-note uniqueness: partial unique index on (tenant, user, type, key)
DO $$ BEGIN
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_planner_notes'
            AND indexname = 'gw_planner_notes_period_uq'
            AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%WHERE%'),
         'period-note partial unique index missing';
END $$;

-- task block linkage: partial unique (note_id, block_id)
DO $$ BEGIN
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_planner_tasks'
            AND indexname = 'gw_planner_tasks_block_uq'
            AND indexdef ILIKE '%UNIQUE%'),
         'task block unique index missing';
END $$;

-- CHECK vocab: status/priority/note_type constraints present
DO $$ BEGIN
  ASSERT (SELECT count(*) >= 1 FROM information_schema.check_constraints cc
          JOIN information_schema.constraint_table_usage u
            ON u.constraint_name = cc.constraint_name
          WHERE u.table_name = 'gw_planner_tasks'
            AND cc.check_clause ILIKE '%cancelled%'),
         'task status CHECK missing';
  ASSERT (SELECT count(*) >= 1 FROM information_schema.check_constraints cc
          JOIN information_schema.constraint_table_usage u
            ON u.constraint_name = cc.constraint_name
          WHERE u.table_name = 'gw_planner_notes'
            AND cc.check_clause ILIKE '%quarterly%'),
         'note_type CHECK missing';
END $$;

-- trigram indexes for search
DO $$ BEGIN
  ASSERT (SELECT count(*) = 2 FROM pg_indexes
          WHERE tablename = 'gw_planner_notes' AND indexdef ILIKE '%gin_trgm_ops%'),
         'trigram indexes on title/content_text missing';
END $$;

-- system template seeds + billing catalog row
DO $$ BEGIN
  ASSERT (SELECT count(*) >= 6 FROM public.gw_planner_templates
          WHERE is_system AND tenant_id IS NULL AND user_id IS NULL),
         'system template seeds missing';
  ASSERT (SELECT count(*) = 1 FROM public.gw_billing_modules
          WHERE id = 'planner' AND tier = 'addon' AND is_active),
         'planner billing module row missing';
END $$;

ROLLBACK;
