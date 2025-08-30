-- Create table for storing MUS240 video edits
CREATE TABLE IF NOT EXISTS public.mus240_video_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  tracks JSONB NOT NULL,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mus240_video_edits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Instructors can manage video edits" ON public.mus240_video_edits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Everyone can view video edits" ON public.mus240_video_edits
  FOR SELECT USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_mus240_video_edits_updated_at
  BEFORE UPDATE ON public.mus240_video_edits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint on week_number
CREATE UNIQUE INDEX IF NOT EXISTS mus240_video_edits_week_number_unique 
ON public.mus240_video_edits(week_number);