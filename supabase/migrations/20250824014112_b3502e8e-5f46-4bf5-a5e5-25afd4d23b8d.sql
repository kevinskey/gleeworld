-- Temporarily disable RLS to diagnose the issue
ALTER TABLE public.gw_study_scores DISABLE ROW LEVEL SECURITY;

-- Check if there are any study scores in the table
-- This will help us understand if the data exists but is being blocked by RLS