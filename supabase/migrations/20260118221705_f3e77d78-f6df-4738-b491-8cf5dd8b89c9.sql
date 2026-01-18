-- Create table for LH100 music selections
CREATE TABLE public.lh100_music_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.lh100_modules(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  liturgical_moment TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  composer_source TEXT DEFAULT '',
  music_key TEXT DEFAULT '',
  ensemble TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, order_number)
);

-- Enable RLS
ALTER TABLE public.lh100_music_selections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view music selections"
ON public.lh100_music_selections
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert music selections"
ON public.lh100_music_selections
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update music selections"
ON public.lh100_music_selections
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete music selections"
ON public.lh100_music_selections
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_lh100_music_selections_module_id ON public.lh100_music_selections(module_id);

-- Add trigger for updated_at
CREATE TRIGGER update_lh100_music_selections_updated_at
BEFORE UPDATE ON public.lh100_music_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();