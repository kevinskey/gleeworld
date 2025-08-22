-- Create table for MUS 240 Survey of African American Music comments
CREATE TABLE public.smaam_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week INTEGER NOT NULL,
  track_index INTEGER,
  author TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.smaam_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Anyone can read comments" 
ON public.smaam_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create comments" 
ON public.smaam_comments 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_smaam_comments_week ON public.smaam_comments(week);
CREATE INDEX idx_smaam_comments_week_track ON public.smaam_comments(week, track_index);