
-- Remove attendance sessions that fall on academic exception dates
-- First, delete any attendance records for these sessions (to avoid FK violations)
DELETE FROM gw_attendance_records 
WHERE attendance_session_id IN (
  'aa8213f7-3cee-4fd6-9bf5-1e88cc1fd805',  -- MUS 070 MLK Day Jan 19
  '6c156016-510e-4539-990b-372c5e7e553b',  -- MUS 210 MLK Day Jan 19
  'dae44d04-9b37-40c3-90ae-1c8c8007d43a',  -- MUS 070 Good Friday Apr 3
  '67b78563-f555-4039-b7d2-18b19340c55a',  -- MUS 240 Founders Day Apr 9
  '29dc7435-3ffd-4fd3-b32c-97c23ede0c55'   -- MUS 070 Research Day Apr 17
);

-- Now delete the invalid sessions
DELETE FROM gw_attendance_sessions 
WHERE id IN (
  'aa8213f7-3cee-4fd6-9bf5-1e88cc1fd805',  -- MUS 070 MLK Day Jan 19
  '6c156016-510e-4539-990b-372c5e7e553b',  -- MUS 210 MLK Day Jan 19
  'dae44d04-9b37-40c3-90ae-1c8c8007d43a',  -- MUS 070 Good Friday Apr 3
  '67b78563-f555-4039-b7d2-18b19340c55a',  -- MUS 240 Founders Day Apr 9
  '29dc7435-3ffd-4fd3-b32c-97c23ede0c55'   -- MUS 070 Research Day Apr 17
);
