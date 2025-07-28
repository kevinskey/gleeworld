-- Enable extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to update scholarships daily at 6 AM
SELECT cron.schedule(
  'daily-scholarship-update',
  '0 6 * * *', -- Daily at 6:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/update-scholarships',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger scholarship updates (for admin use)
CREATE OR REPLACE FUNCTION trigger_scholarship_update()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result text;
BEGIN
  -- Call the edge function
  SELECT net.http_post(
    url:='https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/update-scholarships',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg"}'::jsonb,
    body:='{"manual_trigger": true}'::jsonb
  ) INTO result;
  
  RETURN 'Scholarship update triggered successfully';
END;
$$;