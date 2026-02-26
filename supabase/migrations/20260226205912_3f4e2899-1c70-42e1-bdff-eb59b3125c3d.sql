
-- Create replies table for tour note threads
CREATE TABLE public.gw_tour_note_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.gw_tour_notes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by note
CREATE INDEX idx_tour_note_replies_note_id ON public.gw_tour_note_replies(note_id);

-- Enable RLS
ALTER TABLE public.gw_tour_note_replies ENABLE ROW LEVEL SECURITY;

-- SELECT: admins, super-admins, exec board
CREATE POLICY "Tour team can view replies"
ON public.gw_tour_note_replies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
      OR gw_profiles.is_exec_board = true
    )
  )
);

-- INSERT: same access
CREATE POLICY "Tour team can create replies"
ON public.gw_tour_note_replies FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
      OR gw_profiles.is_exec_board = true
    )
  )
);

-- UPDATE: author or admin
CREATE POLICY "Authors and admins can update replies"
ON public.gw_tour_note_replies FOR UPDATE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
  )
);

-- DELETE: author or admin
CREATE POLICY "Authors and admins can delete replies"
ON public.gw_tour_note_replies FOR DELETE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
  )
);

-- Add reply_count to notes for quick display
ALTER TABLE public.gw_tour_notes ADD COLUMN reply_count INTEGER NOT NULL DEFAULT 0;

-- Trigger to auto-update reply_count
CREATE OR REPLACE FUNCTION public.update_tour_note_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE gw_tour_notes SET reply_count = reply_count + 1 WHERE id = NEW.note_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE gw_tour_notes SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_tour_note_reply_count
AFTER INSERT OR DELETE ON public.gw_tour_note_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_tour_note_reply_count();
