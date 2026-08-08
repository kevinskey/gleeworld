BEGIN;
ALTER TABLE public.gw_all_state_tasks
  ADD COLUMN IF NOT EXISTS source_repertoire_id uuid
    REFERENCES public.gw_all_state_repertoire(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.gw_all_state_tasks.source_repertoire_id IS
  'Set when a task was generated from a specific audition piece. Lets the '
  'student page deep-link into the music library searching for that title.';
COMMIT;
NOTIFY pgrst, 'reload schema';
