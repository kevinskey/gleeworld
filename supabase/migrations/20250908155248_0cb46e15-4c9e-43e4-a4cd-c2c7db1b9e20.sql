-- Enable realtime for assignment_submissions table
ALTER TABLE public.assignment_submissions REPLICA IDENTITY FULL;

-- Add assignment_submissions to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;