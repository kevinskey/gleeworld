-- Create table for sheet music favorites
CREATE TABLE IF NOT EXISTS public.gw_sheet_music_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, sheet_music_id)
);

-- Enable RLS
ALTER TABLE public.gw_sheet_music_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
  ON public.gw_sheet_music_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorites"
  ON public.gw_sheet_music_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites"
  ON public.gw_sheet_music_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites"
  ON public.gw_sheet_music_favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.gw_sheet_music_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_sheet_music_id ON public.gw_sheet_music_favorites(sheet_music_id);