-- Backfill leading-tenant_id indexes for the 27 public tables that have a
-- tenant_id column but no index leading with it. Every RLS policy in this
-- schema filters by `tenant_id = current_tenant_id()`; without a leading
-- tenant_id index Postgres seq-scans the whole table on each query.
--
-- All targets here are currently empty or have <20 rows (audited
-- 2026-06-29), so plain CREATE INDEX is fast and non-disruptive. We use
-- IF NOT EXISTS so re-running the migration is a no-op. Views are
-- intentionally excluded — they inherit indexes from their base tables.
--
-- This is preventative — these tables grow over time (courses, ticketing,
-- part-tracks projects), and without the index a tenant with 10k+ rows
-- here would see a noticeable RLS slowdown on every list query.

CREATE INDEX IF NOT EXISTS gw_course_addons_tenant_idx                   ON public.gw_course_addons                   (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_cohort_members_tenant_idx           ON public.gw_course_cohort_members           (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_cohorts_tenant_idx                  ON public.gw_course_cohorts                  (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_concert_events_tenant_idx           ON public.gw_course_concert_events           (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_concert_ticket_requests_tenant_idx  ON public.gw_course_concert_ticket_requests  (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_module_completions_tenant_idx       ON public.gw_course_module_completions       (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_test_answers_tenant_idx             ON public.gw_course_test_answers             (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_test_attempts_tenant_idx            ON public.gw_course_test_attempts            (tenant_id);
CREATE INDEX IF NOT EXISTS gw_course_test_questions_tenant_idx           ON public.gw_course_test_questions           (tenant_id);

CREATE INDEX IF NOT EXISTS gw_sheet_music_recent_opens_tenant_idx        ON public.gw_sheet_music_recent_opens        (tenant_id);
CREATE INDEX IF NOT EXISTS gw_sheet_music_bookmarks_tenant_idx           ON public.gw_sheet_music_bookmarks           (tenant_id);
CREATE INDEX IF NOT EXISTS gw_sheet_music_audio_tracks_tenant_idx        ON public.gw_sheet_music_audio_tracks        (tenant_id);
CREATE INDEX IF NOT EXISTS gw_sheet_music_jumps_tenant_idx               ON public.gw_sheet_music_jumps               (tenant_id);
CREATE INDEX IF NOT EXISTS gw_sheet_music_annotation_layers_tenant_idx   ON public.gw_sheet_music_annotation_layers   (tenant_id);

CREATE INDEX IF NOT EXISTS gw_concert_program_pieces_tenant_idx          ON public.gw_concert_program_pieces          (tenant_id);
CREATE INDEX IF NOT EXISTS gw_concert_roster_members_tenant_idx          ON public.gw_concert_roster_members          (tenant_id);
CREATE INDEX IF NOT EXISTS gw_concert_roster_sections_tenant_idx         ON public.gw_concert_roster_sections         (tenant_id);

CREATE INDEX IF NOT EXISTS gw_ticket_tiers_tenant_idx                    ON public.gw_ticket_tiers                    (tenant_id);
CREATE INDEX IF NOT EXISTS gw_tickets_tenant_idx                         ON public.gw_tickets                         (tenant_id);

CREATE INDEX IF NOT EXISTS gw_part_tracks_projects_tenant_idx            ON public.gw_part_tracks_projects            (tenant_id);
CREATE INDEX IF NOT EXISTS gw_part_tracks_tracks_tenant_idx              ON public.gw_part_tracks_tracks              (tenant_id);
CREATE INDEX IF NOT EXISTS gw_part_tracks_recordings_tenant_idx          ON public.gw_part_tracks_recordings          (tenant_id);

CREATE INDEX IF NOT EXISTS gw_hero_slides_tenant_idx                     ON public.gw_hero_slides                     (tenant_id);
CREATE INDEX IF NOT EXISTS gw_hero_settings_tenant_idx                   ON public.gw_hero_settings                   (tenant_id);

CREATE INDEX IF NOT EXISTS gw_google_events_tenant_idx                   ON public.gw_google_events                   (tenant_id);
CREATE INDEX IF NOT EXISTS gw_oauth_states_tenant_idx                    ON public.gw_oauth_states                    (tenant_id);
CREATE INDEX IF NOT EXISTS gw_push_tokens_tenant_idx                     ON public.gw_push_tokens                     (tenant_id);
