-- Create storage bucket for MusicXML files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('musicxml-exercises', 'musicxml-exercises', true);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, action_type, window_start)
);

-- Enable RLS on rate limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own rate limits
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policy: Users can insert their own rate limits
CREATE POLICY "Users can insert own rate limits" ON public.rate_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policy: Users can update their own rate limits
CREATE POLICY "Users can update own rate limits" ON public.rate_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Storage policies for MusicXML bucket
CREATE POLICY "Authenticated users can upload MusicXML files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'musicxml-exercises' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view MusicXML files"
ON storage.objects FOR SELECT
USING (bucket_id = 'musicxml-exercises');

CREATE POLICY "Users can update their own MusicXML files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'musicxml-exercises' AND auth.uid()::text = owner);

CREATE POLICY "Users can delete their own MusicXML files"
ON storage.objects FOR DELETE
USING (bucket_id = 'musicxml-exercises' AND auth.uid()::text = owner);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  window_start_time TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
BEGIN
  window_start_time := date_trunc('minute', now()) - (p_window_minutes - 1) * INTERVAL '1 minute';
  
  -- Clean up old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time - INTERVAL '1 hour';
  
  -- Get current count in window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = p_user_id 
    AND action_type = p_action_type 
    AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Increment counter
  INSERT INTO public.rate_limits (user_id, action_type, window_start)
  VALUES (p_user_id, p_action_type, date_trunc('minute', now()))
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN true;
END;
$$;