-- Musical-facts blob computed by the PartTrack worker at analyze time,
-- read by the assistant's get_score_analysis tool. NULL = not yet computed.
-- Spec: docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md
-- Self-hosted prod has no migration runner: Kevin applies this by hand as
-- supabase_admin BEFORE the worker deploy (the analyze UPDATE references it).
ALTER TABLE public.gw_parttrack_scores ADD COLUMN IF NOT EXISTS analysis jsonb;
