-- Add recurrence fields to gw_announcements
ALTER TABLE public.gw_announcements
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', NULL)),
ADD COLUMN IF NOT EXISTS recurrence_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_recurrence_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_announcement_id UUID REFERENCES public.gw_announcements(id) ON DELETE SET NULL;

-- Create index for efficient recurring announcement queries
CREATE INDEX IF NOT EXISTS idx_announcements_recurrence ON public.gw_announcements(is_recurring, recurrence_type, last_recurrence_at) WHERE is_recurring = true;