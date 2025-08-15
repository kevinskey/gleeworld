-- Add XML content field to sheet music for storing MusicXML data
ALTER TABLE public.gw_sheet_music 
ADD COLUMN xml_content TEXT;

-- Add XML file URL field for storing uploaded XML files
ALTER TABLE public.gw_sheet_music 
ADD COLUMN xml_url TEXT;

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_gw_sheet_music_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_sheet_music' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.gw_sheet_music ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_gw_sheet_music_updated_at_trigger ON public.gw_sheet_music;
CREATE TRIGGER update_gw_sheet_music_updated_at_trigger
  BEFORE UPDATE ON public.gw_sheet_music
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_sheet_music_updated_at();