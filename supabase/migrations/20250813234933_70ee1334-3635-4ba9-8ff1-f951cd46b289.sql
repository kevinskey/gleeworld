-- Migration to consolidate gw_auditions data into audition_applications
-- Fixed timestamp handling

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
  -- Handle timestamp conversion more carefully
  CASE 
    WHEN gw.audition_date IS NOT NULL THEN
      gw.audition_date::timestamp with time zone + INTERVAL '14 hours'  -- Default to 2 PM
    ELSE
      NOW() + INTERVAL '1 day'  -- Schedule for tomorrow if no date
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

-- Update the sequences to avoid ID conflicts
SELECT setval('audition_applications_id_seq', (SELECT MAX(id) FROM audition_applications));

-- Log the consolidation results
DO $$
DECLARE
  final_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO final_count FROM audition_applications;
  SELECT COUNT(*) INTO migrated_count FROM gw_auditions gw
  WHERE EXISTS (
    SELECT 1 FROM audition_applications aa 
    WHERE aa.email = gw.email AND aa.created_at >= gw.created_at
  );
  
  RAISE NOTICE 'Consolidation completed successfully!';
  RAISE NOTICE 'Total applications now in audition_applications: %', final_count;
  RAISE NOTICE 'Records migrated from gw_auditions: %', migrated_count;
END $$;