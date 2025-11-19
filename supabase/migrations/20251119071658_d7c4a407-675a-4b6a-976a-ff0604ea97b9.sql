-- Create table to store SoundCloud OAuth tokens
CREATE TABLE IF NOT EXISTS public.soundcloud_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.soundcloud_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own tokens
CREATE POLICY "Users can read own soundcloud tokens"
  ON public.soundcloud_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own soundcloud tokens"
  ON public.soundcloud_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own soundcloud tokens"
  ON public.soundcloud_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own soundcloud tokens"
  ON public.soundcloud_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_soundcloud_tokens_user_id ON public.soundcloud_tokens(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_soundcloud_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_soundcloud_tokens_updated_at
  BEFORE UPDATE ON public.soundcloud_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_soundcloud_tokens_updated_at();