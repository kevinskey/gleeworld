-- Create table for annotation sharing
CREATE TABLE public.gw_annotation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marked_score_id UUID NOT NULL REFERENCES public.gw_marked_scores(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_with UUID NOT NULL,
  permission_type TEXT NOT NULL DEFAULT 'view' CHECK (permission_type IN ('view', 'edit')),
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for public annotation shares (shareable links)
CREATE TABLE public.gw_annotation_public_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marked_score_id UUID NOT NULL REFERENCES public.gw_marked_scores(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  title TEXT NOT NULL,
  description TEXT,
  permission_type TEXT NOT NULL DEFAULT 'view' CHECK (permission_type IN ('view', 'edit')),
  is_public BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add sharing metadata to marked scores
ALTER TABLE public.gw_marked_scores 
ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{"allow_public": false, "allow_direct": true}'::jsonb;

-- Create indexes
CREATE INDEX idx_annotation_shares_shared_with ON public.gw_annotation_shares(shared_with);
CREATE INDEX idx_annotation_shares_marked_score ON public.gw_annotation_shares(marked_score_id);
CREATE INDEX idx_annotation_public_shares_token ON public.gw_annotation_public_shares(share_token);
CREATE INDEX idx_annotation_public_shares_shared_by ON public.gw_annotation_public_shares(shared_by);

-- Enable RLS
ALTER TABLE public.gw_annotation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_annotation_public_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_annotation_shares
CREATE POLICY "Users can view shares they created or received"
  ON public.gw_annotation_shares FOR SELECT
  USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create annotation shares"
  ON public.gw_annotation_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by AND EXISTS (
    SELECT 1 FROM public.gw_marked_scores 
    WHERE id = marked_score_id AND uploader_id = auth.uid()
  ));

CREATE POLICY "Share creators can update their shares"
  ON public.gw_annotation_shares FOR UPDATE
  USING (auth.uid() = shared_by);

CREATE POLICY "Share creators can delete their shares"
  ON public.gw_annotation_shares FOR DELETE
  USING (auth.uid() = shared_by);

-- RLS Policies for gw_annotation_public_shares
CREATE POLICY "Users can view public shares they created"
  ON public.gw_annotation_public_shares FOR SELECT
  USING (auth.uid() = shared_by);

CREATE POLICY "Anyone can view active public shares"
  ON public.gw_annotation_public_shares FOR SELECT
  USING (is_active = true AND is_public = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Users can create public shares for their annotations"
  ON public.gw_annotation_public_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by AND EXISTS (
    SELECT 1 FROM public.gw_marked_scores 
    WHERE id = marked_score_id AND uploader_id = auth.uid()
  ));

CREATE POLICY "Share creators can update their public shares"
  ON public.gw_annotation_public_shares FOR UPDATE
  USING (auth.uid() = shared_by);

CREATE POLICY "Share creators can delete their public shares"
  ON public.gw_annotation_public_shares FOR DELETE
  USING (auth.uid() = shared_by);

-- Create function to update view count
CREATE OR REPLACE FUNCTION public.increment_annotation_share_views(share_token_param TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.gw_annotation_public_shares 
  SET view_count = view_count + 1 
  WHERE share_token = share_token_param AND is_active = true;
END;
$$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_annotation_shares_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_annotation_shares_updated_at
  BEFORE UPDATE ON public.gw_annotation_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_annotation_shares_updated_at();

CREATE TRIGGER update_annotation_public_shares_updated_at
  BEFORE UPDATE ON public.gw_annotation_public_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_annotation_shares_updated_at();