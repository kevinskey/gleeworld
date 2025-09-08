-- Enable RLS on journal tables that are missing it from the security warnings
ALTER TABLE public.mus240_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_journal_comments ENABLE ROW LEVEL SECURITY;