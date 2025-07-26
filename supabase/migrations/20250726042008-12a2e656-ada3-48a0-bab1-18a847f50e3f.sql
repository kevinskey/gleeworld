-- Create auditions table
CREATE TABLE public.gw_auditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  sang_in_middle_school BOOLEAN NOT NULL DEFAULT false,
  sang_in_high_school BOOLEAN NOT NULL DEFAULT false,
  high_school_years TEXT,
  plays_instrument BOOLEAN NOT NULL DEFAULT false,
  instrument_details TEXT,
  is_soloist BOOLEAN NOT NULL DEFAULT false,
  soloist_rating INTEGER CHECK (soloist_rating >= 1 AND soloist_rating <= 10),
  high_school_section TEXT,
  reads_music BOOLEAN NOT NULL DEFAULT false,
  interested_in_voice_lessons BOOLEAN NOT NULL DEFAULT false,
  interested_in_music_fundamentals BOOLEAN NOT NULL DEFAULT false,
  personality_description TEXT NOT NULL,
  interested_in_leadership BOOLEAN NOT NULL DEFAULT false,
  additional_info TEXT,
  audition_date TIMESTAMP WITH TIME ZONE NOT NULL,
  audition_time TEXT NOT NULL,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_auditions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own auditions" ON public.gw_auditions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own auditions" ON public.gw_auditions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auditions" ON public.gw_auditions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all auditions" ON public.gw_auditions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage all auditions" ON public.gw_auditions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_gw_auditions_updated_at
  BEFORE UPDATE ON public.gw_auditions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audition files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for audition files
CREATE POLICY "Users can upload their own audition files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own audition files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all audition files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-files' AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);