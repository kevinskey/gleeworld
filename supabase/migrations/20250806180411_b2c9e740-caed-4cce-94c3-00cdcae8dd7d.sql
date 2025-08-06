-- Add unique constraint on user_id for gw_auditions to prevent duplicates
ALTER TABLE public.gw_auditions 
ADD CONSTRAINT gw_auditions_user_id_unique UNIQUE (user_id);

-- One-time sync of all existing audition applications
-- First, assign auditioner roles to existing applicants
INSERT INTO public.gw_profiles (user_id, email, full_name, role, verified)
SELECT DISTINCT 
  aa.user_id, 
  aa.email, 
  aa.full_name, 
  'auditioner', 
  true
FROM public.audition_applications aa
LEFT JOIN public.gw_profiles gp ON aa.user_id = gp.user_id
WHERE gp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update existing profiles to auditioner role if they're visitors/fans/users
UPDATE public.gw_profiles 
SET 
  role = 'auditioner',
  verified = true,
  updated_at = now()
WHERE user_id IN (
  SELECT DISTINCT user_id FROM public.audition_applications
) 
AND (role IN ('visitor', 'fan', 'user') OR role IS NULL);

-- Sync all existing applications to gw_auditions table
INSERT INTO public.gw_auditions (
  user_id, first_name, last_name, email, phone, 
  sang_in_high_school, high_school_section, plays_instrument, 
  instrument_details, reads_music, personality_description, 
  additional_info, audition_date, audition_time, status, 
  created_at, updated_at
)
SELECT DISTINCT ON (aa.user_id)
  aa.user_id,
  SPLIT_PART(aa.full_name, ' ', 1),
  CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(aa.full_name, ' '), 1) > 1 
    THEN SUBSTRING(aa.full_name FROM POSITION(' ' IN aa.full_name) + 1)
    ELSE ''
  END,
  aa.email,
  COALESCE(aa.phone_number, ''),
  CASE WHEN aa.previous_choir_experience ILIKE '%high school%' THEN true ELSE false END,
  aa.voice_part_preference,
  CASE WHEN ARRAY_LENGTH(aa.instruments_played, 1) > 0 THEN true ELSE false END,
  CASE WHEN ARRAY_LENGTH(aa.instruments_played, 1) > 0 THEN aa.instruments_played[1] ELSE NULL END,
  CASE WHEN aa.music_theory_background != 'None' THEN true ELSE false END,
  aa.why_glee_club,
  aa.vocal_goals,
  aa.audition_time_slot,
  EXTRACT(HOUR FROM aa.audition_time_slot)::text || ':' || LPAD(EXTRACT(MINUTE FROM aa.audition_time_slot)::text, 2, '0'),
  aa.status,
  aa.created_at,
  aa.updated_at
FROM public.audition_applications aa
LEFT JOIN public.gw_auditions ga ON aa.user_id = ga.user_id
WHERE ga.user_id IS NULL
ORDER BY aa.user_id, aa.created_at DESC
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  sang_in_high_school = EXCLUDED.sang_in_high_school,
  high_school_section = EXCLUDED.high_school_section,
  plays_instrument = EXCLUDED.plays_instrument,
  instrument_details = EXCLUDED.instrument_details,
  reads_music = EXCLUDED.reads_music,
  personality_description = EXCLUDED.personality_description,
  additional_info = EXCLUDED.additional_info,
  audition_date = EXCLUDED.audition_date,
  audition_time = EXCLUDED.audition_time,
  status = EXCLUDED.status,
  updated_at = now();