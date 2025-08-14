-- Remove Thursday auditions from gw_auditions table
-- First, let's see what Thursday auditions we have
DELETE FROM gw_auditions 
WHERE EXTRACT(DOW FROM audition_date) = 4;  -- Thursday

-- Also remove any Thursday audition time blocks (though none appear to exist)
DELETE FROM audition_time_blocks 
WHERE EXTRACT(DOW FROM start_date) = 4 OR EXTRACT(DOW FROM end_date) = 4;