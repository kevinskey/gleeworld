-- Create table for storing Google OAuth tokens
CREATE TABLE IF NOT EXISTS public.google_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL DEFAULT 'user', -- 'user' or 'system'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own tokens" ON public.google_auth_tokens
  FOR ALL USING (
    user_id = auth.uid() OR 
    (user_type = 'system' AND EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ))
  );

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_google_auth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_auth_tokens_updated_at
  BEFORE UPDATE ON public.google_auth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_google_auth_tokens_updated_at();