-- Make assign_auditioner_role resilient to missing full_name column on NEW
CREATE OR REPLACE FUNCTION public.assign_auditioner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_full_name text;
BEGIN
  -- Safely resolve full name from NEW, even if the table lacks full_name
  v_full_name := COALESCE(
    to_jsonb(NEW)->>'full_name',
    trim(both ' ' from concat_ws(' ', to_jsonb(NEW)->>'first_name', to_jsonb(NEW)->>'middle_name', to_jsonb(NEW)->>'last_name'))
  );

  -- Update or create profile with auditioner role
  INSERT INTO public.gw_profiles (user_id, email, full_name, role, verified)
  VALUES (NEW.user_id, NEW.email, v_full_name, 'auditioner', true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = CASE 
      WHEN gw_profiles.role IN ('visitor', 'fan', 'user') OR gw_profiles.role IS NULL 
      THEN 'auditioner' 
      ELSE gw_profiles.role 
    END,
    email = COALESCE(gw_profiles.email, NEW.email),
    full_name = COALESCE(gw_profiles.full_name, v_full_name),
    verified = true,
    updated_at = now();
    
  RETURN NEW;
END;
$$;

-- Make sync_audition_to_management resilient to missing full_name column on NEW
CREATE OR REPLACE FUNCTION public.sync_audition_to_management()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_full_name := COALESCE(
    to_jsonb(NEW)->>'full_name',
    trim(both ' ' from concat_ws(' ', to_jsonb(NEW)->>'first_name', to_jsonb(NEW)->>'middle_name', to_jsonb(NEW)->>'last_name'))
  );

  v_first_name := COALESCE(split_part(v_full_name, ' ', 1), '');
  v_last_name := CASE 
    WHEN length(v_full_name) - length(replace(v_full_name, ' ', '')) >= 1 THEN substring(v_full_name from position(' ' in v_full_name) + 1)
    ELSE ''
  END;

  -- Insert or update corresponding record in gw_auditions for admin management
  INSERT INTO public.gw_auditions (
    user_id, first_name, last_name, email, phone, 
    sang_in_high_school, high_school_section, plays_instrument, 
    instrument_details, reads_music, personality_description, 
    additional_info, audition_date, audition_time, status
  )
  VALUES (
    NEW.user_id,
    v_first_name,
    v_last_name,
    NEW.email,
    NEW.phone_number,
    CASE WHEN NEW.previous_choir_experience ILIKE '%high school%' THEN true ELSE false END,
    NEW.voice_part_preference,
    CASE WHEN ARRAY_LENGTH(NEW.instruments_played, 1) > 0 THEN true ELSE false END,
    CASE WHEN ARRAY_LENGTH(NEW.instruments_played, 1) > 0 THEN NEW.instruments_played[1] ELSE NULL END,
    CASE WHEN NEW.music_theory_background != 'None' THEN true ELSE false END,
    NEW.why_glee_club,
    NEW.vocal_goals,
    NEW.audition_time_slot::date,
    NEW.audition_time_slot::time,
    NEW.status
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
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
    
  RETURN NEW;
END;
$$;