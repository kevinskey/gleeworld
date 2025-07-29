-- Add Google Docs integration columns to meeting minutes table
ALTER TABLE public.gw_meeting_minutes 
ADD COLUMN IF NOT EXISTS google_doc_id TEXT,
ADD COLUMN IF NOT EXISTS google_doc_url TEXT;