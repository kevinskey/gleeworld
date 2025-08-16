-- Create new tables for First-Year cohort reporting
-- Working around existing events table structure

-- 1. Users table (if not exists)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Cohorts table
CREATE TABLE IF NOT EXISTS public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(name, year)
);

-- 3. Cohort members table
CREATE TABLE IF NOT EXISTS public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  voice_part text CHECK (voice_part IN ('soprano', 'alto', 'tenor', 'bass')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'probation', 'graduated')),
  joined_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, cohort_id)
);

-- 4. Attendance table (referencing existing events table)
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
  recorded_at timestamp with time zone DEFAULT now(),
  notes text,
  UNIQUE(event_id, user_id)
);

-- 5. Coordinator cohorts mapping table
CREATE TABLE IF NOT EXISTS public.coordinator_cohorts (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY(user_id, cohort_id)
);

-- Add cohort_id to existing events table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'cohort_id'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL;
  END IF;
END $$;