-- Migration to consolidate gw_auditions data into audition_applications
-- This will eliminate the dual-table confusion and provide a single source of truth

-- First, let's see what data we're working with
DO $$
BEGIN
  RAISE NOTICE 'Starting consolidation of audition data...';
  RAISE NOTICE 'Current gw_auditions count: %', (SELECT COUNT(*) FROM gw_auditions);
  RAISE NOTICE 'Current audition_applications count: %', (SELECT COUNT(*) FROM audition_applications);
END $$;

-- Insert data from gw_auditions into audition_applications, mapping fields appropriately
INSERT INTO audition_applications (
  user_id,
  full_name,
  email,
  phone_number,
  audition_time_slot,
  status,
  academic_year,
  voice_part_preference,
  sight_reading_level,
  previous_choir_experience,
  instruments_played,
  prepared_pieces,
  notes,
  profile_image_url,
  created_at,
  updated_at
)
SELECT 
  gw.user_id,
  CONCAT(gw.first_name, ' ', gw.last_name) as full_name,
  gw.email,
  gw.phone as phone_number,
  -- Combine audition_date and audition_time into timestamp
  CASE 
    WHEN gw.audition_date IS NOT NULL AND gw.audition_time IS NOT NULL THEN
      (gw.audition_date || ' ' || gw.audition_time)::timestamp with time zone
    WHEN gw.audition_date IS NOT NULL THEN
      gw.audition_date::timestamp with time zone
    ELSE
      NOW() -- Fallback to current time
  END as audition_time_slot,
  gw.status,
  gw.high_school_years as academic_year,
  gw.high_school_section as voice_part_preference,
  CASE 
    WHEN gw.reads_music THEN 'Intermediate'
    ELSE 'Beginner'
  END as sight_reading_level,
  CASE
    WHEN gw.sang_in_high_school THEN 'High school choir'
    WHEN gw.sang_in_middle_school THEN 'Middle school choir'
    ELSE 'No formal experience'
  END as previous_choir_experience,
  -- Convert instrument info to array format
  CASE 
    WHEN gw.plays_instrument AND gw.instrument_details IS NOT NULL THEN
      ARRAY[gw.instrument_details]
    ELSE
      ARRAY[]::text[]
  END as instruments_played,
  CASE
    WHEN gw.is_soloist THEN 'Solo performance prepared'
    ELSE 'Standard audition pieces'
  END as prepared_pieces,
  COALESCE(gw.additional_info, gw.personality_description) as notes,
  gw.selfie_url as profile_image_url,
  gw.created_at,
  gw.updated_at
FROM gw_auditions gw
WHERE NOT EXISTS (
  -- Avoid duplicates by checking if email already exists in audition_applications
  SELECT 1 FROM audition_applications aa 
  WHERE aa.email = gw.email
);

-- Log the results
DO $$
BEGIN
  RAISE NOTICE 'Migration completed!';
  RAISE NOTICE 'Final audition_applications count: %', (SELECT COUNT(*) FROM audition_applications);
  RAISE NOTICE 'Records migrated: %', (
    SELECT COUNT(*) FROM gw_auditions gw
    WHERE NOT EXISTS (
      SELECT 1 FROM audition_applications aa 
      WHERE aa.email = gw.email AND aa.created_at < gw.created_at
    )
  );
END $$;