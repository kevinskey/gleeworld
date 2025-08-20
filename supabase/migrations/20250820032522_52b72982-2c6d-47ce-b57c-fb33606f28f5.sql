-- Create gw_profiles table for onboarding
CREATE TABLE IF NOT EXISTS public.gw_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  preferred_name TEXT,
  pronouns TEXT,
  email TEXT,
  phone TEXT,
  voice_part TEXT,
  section TEXT,
  grad_year INTEGER,
  height_cm INTEGER,
  chest NUMERIC,
  waist NUMERIC,
  hips NUMERIC,
  shoe NUMERIC,
  photo_consent BOOLEAN DEFAULT false,
  media_release_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.gw_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.gw_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.gw_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_gw_profiles_updated_at
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();