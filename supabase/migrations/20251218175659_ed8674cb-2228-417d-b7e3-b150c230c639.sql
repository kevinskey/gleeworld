-- Add course_id column to gw_message_groups for course-linked messaging
ALTER TABLE public.gw_message_groups ADD COLUMN IF NOT EXISTS course_id TEXT;

-- Create index for efficient course filtering
CREATE INDEX IF NOT EXISTS idx_message_groups_course ON public.gw_message_groups(course_id);

-- Add group_type column if not exists for distinguishing course groups
ALTER TABLE public.gw_message_groups ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'general';

-- Create index for group type filtering
CREATE INDEX IF NOT EXISTS idx_message_groups_type ON public.gw_message_groups(group_type);