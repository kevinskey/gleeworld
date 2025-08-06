-- Create pitch_results table for storing singing assessment data
CREATE TABLE public.pitch_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pitch_results ENABLE ROW LEVEL SECURITY;

-- Create policies for pitch_results access
CREATE POLICY "Users can view their own pitch results" 
ON public.pitch_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pitch results" 
ON public.pitch_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all pitch results" 
ON public.pitch_results 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pitch_results_updated_at
  BEFORE UPDATE ON public.pitch_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();