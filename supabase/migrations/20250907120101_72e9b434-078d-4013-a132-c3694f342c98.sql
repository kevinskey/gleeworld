-- Create liturgical_worksheets table for weekly liturgy planning
CREATE TABLE IF NOT EXISTS public.liturgical_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liturgical_date DATE NOT NULL,
  liturgical_season TEXT NOT NULL,
  readings JSONB DEFAULT '{}',
  music_selections JSONB DEFAULT '{}',
  special_instructions TEXT,
  theme TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liturgical_worksheets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own liturgical worksheets"
  ON public.liturgical_worksheets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own liturgical worksheets"
  ON public.liturgical_worksheets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liturgical worksheets"
  ON public.liturgical_worksheets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liturgical worksheets"
  ON public.liturgical_worksheets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all worksheets
CREATE POLICY "Admins can manage all liturgical worksheets"
  ON public.liturgical_worksheets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_liturgical_worksheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_liturgical_worksheets_updated_at
  BEFORE UPDATE ON public.liturgical_worksheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_liturgical_worksheets_updated_at();