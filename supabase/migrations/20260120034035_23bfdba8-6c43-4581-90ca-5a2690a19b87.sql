-- Add content columns to mus240_module_settings
ALTER TABLE mus240_module_settings 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS week_number INTEGER,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update existing modules with default titles
UPDATE mus240_module_settings SET 
  title = 'Introduction to African American Music',
  description = 'An overview of the course and introduction to African American musical traditions.',
  week_number = 1
WHERE module_id = 'week-1' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Spirituals and the Enslaved Experience',
  description = 'Exploring the origins of spirituals and their role in African American history.',
  week_number = 2
WHERE module_id = 'week-2' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Blues: From Delta to Urban',
  description = 'The evolution of blues from rural Mississippi to urban centers.',
  week_number = 3
WHERE module_id = 'week-3' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Jazz: The Birth of an American Art Form',
  description = 'The origins and early development of jazz music.',
  week_number = 4
WHERE module_id = 'week-4' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'The Harlem Renaissance',
  description = 'Music during the cultural explosion of the Harlem Renaissance.',
  week_number = 5
WHERE module_id = 'week-5' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Swing Era and Big Bands',
  description = 'The swing era and the rise of big band music.',
  week_number = 6
WHERE module_id = 'week-6' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Bebop Revolution',
  description = 'The bebop movement and its impact on jazz.',
  week_number = 7
WHERE module_id = 'week-7' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Gospel Music',
  description = 'The development and influence of gospel music.',
  week_number = 8
WHERE module_id = 'week-8' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Rhythm & Blues',
  description = 'The emergence of R&B and its musical characteristics.',
  week_number = 9
WHERE module_id = 'week-9' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Soul Music',
  description = 'Soul music and its cultural significance.',
  week_number = 10
WHERE module_id = 'week-10' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Funk and Disco',
  description = 'The funk and disco movements of the 1970s.',
  week_number = 11
WHERE module_id = 'week-11' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Hip-Hop Origins',
  description = 'The birth of hip-hop in the Bronx.',
  week_number = 12
WHERE module_id = 'week-12' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Contemporary R&B',
  description = 'Modern R&B and its evolution.',
  week_number = 13
WHERE module_id = 'week-13' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Hip-Hop Evolution',
  description = 'The evolution of hip-hop from the 1990s to today.',
  week_number = 14
WHERE module_id = 'week-14' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Current Trends',
  description = 'Contemporary trends in African American music.',
  week_number = 15
WHERE module_id = 'week-15' AND title IS NULL;

UPDATE mus240_module_settings SET 
  title = 'Final Review',
  description = 'Course review and final exam preparation.',
  week_number = 16
WHERE module_id = 'week-16' AND title IS NULL;

-- Create module resources table
CREATE TABLE IF NOT EXISTS mus240_module_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video', 'reading', 'audio', 'document', 'assignment', 'quiz', 'discussion', 'link')),
  url TEXT,
  description TEXT,
  duration TEXT,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE mus240_module_resources ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read resources
CREATE POLICY "Anyone can read module resources"
ON mus240_module_resources FOR SELECT
TO authenticated
USING (true);

-- Allow admins and instructors to manage resources
CREATE POLICY "Admins can manage module resources"
ON mus240_module_resources FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM course_teaching_assistants 
    WHERE user_id = auth.uid() 
    AND course_code = 'MUS240' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM course_teaching_assistants 
    WHERE user_id = auth.uid() 
    AND course_code = 'MUS240' 
    AND is_active = true
  )
);