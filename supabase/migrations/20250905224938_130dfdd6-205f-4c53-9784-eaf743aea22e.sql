-- Fix the missing published_at column in mus240_journal_entries table
ALTER TABLE public.mus240_journal_entries 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;