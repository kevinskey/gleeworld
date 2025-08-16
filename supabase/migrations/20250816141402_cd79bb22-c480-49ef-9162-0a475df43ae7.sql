-- Create the core tables for First-Year cohort reporting (fixed order)
-- This creates a clean reporting layer without affecting existing QR attendance flow

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

-- 3. Events table (moved before cohort_members to avoid FK issues)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  title text NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  location text,
  event_type text DEFAULT 'rehearsal',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Cohort members table
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

-- 5. Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
  recorded_at timestamp with time zone DEFAULT now(),
  notes text,
  UNIQUE(event_id, user_id)
);

-- 6. Coordinator cohorts mapping table
CREATE TABLE IF NOT EXISTS public.coordinator_cohorts (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY(user_id, cohort_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cohort_members_user_id ON public.cohort_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort_id ON public.cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_events_cohort_id ON public.events(cohort_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);