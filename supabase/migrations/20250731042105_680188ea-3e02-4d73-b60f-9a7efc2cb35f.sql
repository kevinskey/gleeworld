-- Create performance scores table
CREATE TABLE IF NOT EXISTS public.gw_performance_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    performer_id UUID,
    performer_name TEXT NOT NULL,
    evaluator_id UUID NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'audition',
    categories JSONB NOT NULL DEFAULT '{}',
    total_score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 50,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    overall_score INTEGER DEFAULT 0,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_performance_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view scores they created" 
ON public.gw_performance_scores 
FOR SELECT 
USING (evaluator_id = auth.uid());

CREATE POLICY "Users can create performance scores" 
ON public.gw_performance_scores 
FOR INSERT 
WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "Users can update their own scores" 
ON public.gw_performance_scores 
FOR UPDATE 
USING (evaluator_id = auth.uid());

CREATE POLICY "Admins can manage all scores" 
ON public.gw_performance_scores 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create trigger for updated_at
CREATE TRIGGER update_gw_performance_scores_updated_at
BEFORE UPDATE ON public.gw_performance_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_performance_scores_evaluator_id ON public.gw_performance_scores(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_gw_performance_scores_performer_id ON public.gw_performance_scores(performer_id);
CREATE INDEX IF NOT EXISTS idx_gw_performance_scores_event_type ON public.gw_performance_scores(event_type);
CREATE INDEX IF NOT EXISTS idx_gw_performance_scores_created_at ON public.gw_performance_scores(created_at);