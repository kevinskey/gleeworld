-- gw_pitch_match_attempts.user_id needs DEFAULT auth.uid() so client
-- inserts (which omit user_id) satisfy both the NOT NULL constraint
-- AND the RLS policy `user_id = auth.uid()`. Without the default,
-- the WITH CHECK compares NULL to a uuid and blocks every write with
-- "new row violates row-level security policy".

ALTER TABLE gw_pitch_match_attempts
  ALTER COLUMN user_id SET DEFAULT auth.uid();
