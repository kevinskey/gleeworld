-- Create table to store scraped USCCB readings
CREATE TABLE IF NOT EXISTS public.usccb_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liturgical_date date NOT NULL,
  liturgical_day text NOT NULL,
  liturgical_season text,
  year_cycle text, -- A, B, or C
  first_reading text,
  first_reading_reference text,
  responsorial_psalm text,
  psalm_response text,
  second_reading text,
  second_reading_reference text,
  gospel_acclamation text,
  gospel text,
  gospel_reference text,
  full_content text,
  source_url text,
  scraped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(liturgical_date, year_cycle)
);

-- Enable RLS
ALTER TABLE public.usccb_readings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Authenticated users can read USCCB readings"
  ON public.usccb_readings FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage readings
CREATE POLICY "Admins can manage USCCB readings"
  ON public.usccb_readings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'superadmin') 
      AND is_active = true
    )
  );

-- Add index for date lookups
CREATE INDEX idx_usccb_readings_date ON public.usccb_readings(liturgical_date);
CREATE INDEX idx_usccb_readings_day ON public.usccb_readings(liturgical_day);