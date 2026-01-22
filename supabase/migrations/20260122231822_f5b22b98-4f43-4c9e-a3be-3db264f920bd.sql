-- Add parent_reply_id to support threaded/nested replies
ALTER TABLE public.discussion_replies
ADD COLUMN IF NOT EXISTS parent_reply_id uuid REFERENCES public.discussion_replies(id) ON DELETE CASCADE;

-- Create index for efficient thread lookups
CREATE INDEX IF NOT EXISTS idx_discussion_replies_parent 
ON public.discussion_replies(parent_reply_id) 
WHERE parent_reply_id IS NOT NULL;