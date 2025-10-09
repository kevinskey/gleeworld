-- Create annotation sharing table
CREATE TABLE IF NOT EXISTS public.gw_sheet_music_annotation_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id uuid NOT NULL REFERENCES public.gw_sheet_music_annotations(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  shared_with uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  UNIQUE(annotation_id, shared_with)
);

-- Enable RLS
ALTER TABLE public.gw_sheet_music_annotation_shares ENABLE ROW LEVEL SECURITY;

-- Owners can manage their shares
CREATE POLICY "Users can manage their annotation shares"
ON public.gw_sheet_music_annotation_shares
FOR ALL
TO authenticated
USING (shared_by = auth.uid())
WITH CHECK (shared_by = auth.uid());

-- Users can view shares granted to them
CREATE POLICY "Users can view shares granted to them"
ON public.gw_sheet_music_annotation_shares
FOR SELECT
TO authenticated
USING (shared_with = auth.uid());

-- Update annotation view policy to include shared annotations
DROP POLICY IF EXISTS "Users can view only their own annotations" ON public.gw_sheet_music_annotations;

CREATE POLICY "Users can view own and shared annotations"
ON public.gw_sheet_music_annotations
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.gw_sheet_music_annotation_shares
    WHERE annotation_id = gw_sheet_music_annotations.id
    AND shared_with = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  )
);