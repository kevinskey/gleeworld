-- Enable realtime for assignment_submissions table
ALTER TABLE public.assignment_submissions REPLICA IDENTITY FULL;

-- Add assignment_submissions to realtime publication
INSERT INTO supabase_realtime.subscription (subscription_id, entity_regclass, entity_regconfig, claims_validator) 
VALUES (
  gen_random_uuid(),
  'assignment_submissions'::regclass,
  null,
  'public'::text
);

-- Also ensure the table is in the realtime publication
SELECT supabase_realtime.subscription_check_filters();

-- Add assignment_submissions to the default publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'assignment_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;
  END IF;
END $$;