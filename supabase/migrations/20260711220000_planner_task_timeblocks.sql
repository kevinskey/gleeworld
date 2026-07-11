-- Planner Day-tab timeline: a task may occupy one time block
-- (block_start + block_minutes). Additive columns on gw_planner_tasks —
-- existing RLS (tenant RESTRICTIVE + owner) already covers them.
-- Removing a block never deletes the task (columns just null out).

ALTER TABLE public.gw_planner_tasks
  ADD COLUMN IF NOT EXISTS block_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS block_minutes INTEGER
    CHECK (block_minutes IS NULL OR (block_minutes >= 5 AND block_minutes <= 720));

CREATE INDEX IF NOT EXISTS gw_planner_tasks_block_start_idx
  ON public.gw_planner_tasks (user_id, block_start)
  WHERE block_start IS NOT NULL;
