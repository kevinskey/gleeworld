-- Create a dedicated table for performance scores instead of using gw_events
CREATE TABLE IF NOT EXISTS public.gw_performance_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    performer_id UUID,
    performer_name TEXT NOT NULL,
    evaluator_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL DEFAULT 'audition',
    song_title TEXT,
    sheet_music_id UUID,
    category_scores JSONB NOT NULL DEFAULT '{}',
    total_score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 50,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    overall_score INTEGER DEFAULT 0,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_performance_scores ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Evaluators can create scores" 
ON public.gw_performance_scores 
FOR INSERT 
WITH CHECK (auth.uid() = evaluator_id);

CREATE POLICY "Evaluators can view their own scores" 
ON public.gw_performance_scores 
FOR SELECT 
USING (auth.uid() = evaluator_id);

CREATE POLICY "Admins can view all scores" 
ON public.gw_performance_scores 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Evaluators can update their own scores" 
ON public.gw_performance_scores 
FOR UPDATE 
USING (auth.uid() = evaluator_id);

CREATE POLICY "Admins can manage all scores" 
ON public.gw_performance_scores 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_gw_performance_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_performance_scores_updated_at
  BEFORE UPDATE ON public.gw_performance_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_performance_scores_updated_at();