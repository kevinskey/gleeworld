-- Create table to store foundation URLs for scraping
CREATE TABLE public.scholarship_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  scrape_frequency_hours INTEGER DEFAULT 24,
  selector_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scholarship_sources ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage scholarship sources" 
ON public.scholarship_sources 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super-admin')
));

-- Add source column to scholarships table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scholarships' AND column_name = 'scraped_from_url'
  ) THEN
    ALTER TABLE public.scholarships ADD COLUMN scraped_from_url TEXT;
  END IF;
END $$;

-- Create trigger for updated_at
CREATE TRIGGER update_scholarship_sources_updated_at
  BEFORE UPDATE ON public.scholarship_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();