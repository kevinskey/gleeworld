-- Create table for storing Order of Mass song selections for LH100 modules
CREATE TABLE public.lh100_mass_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  mass_part TEXT NOT NULL,
  song_title TEXT,
  hymn_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_module_part UNIQUE (user_id, module_id, mass_part)
);

-- Enable RLS
ALTER TABLE public.lh100_mass_songs ENABLE ROW LEVEL SECURITY;

-- Users can view their own song selections
CREATE POLICY "Users can view their own mass songs" 
ON public.lh100_mass_songs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own song selections
CREATE POLICY "Users can create their own mass songs" 
ON public.lh100_mass_songs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own song selections
CREATE POLICY "Users can update their own mass songs" 
ON public.lh100_mass_songs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own song selections
CREATE POLICY "Users can delete their own mass songs" 
ON public.lh100_mass_songs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin policy for viewing all entries
CREATE POLICY "Admins can view all mass songs"
ON public.lh100_mass_songs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_roles 
    WHERE app_roles.user_id = auth.uid() 
    AND app_roles.role IN ('admin', 'superadmin', 'instructor')
    AND app_roles.is_active = true
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_lh100_mass_songs_updated_at
BEFORE UPDATE ON public.lh100_mass_songs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();