-- Create MWF attendance sessions for MUS 070 (Glee Club) Spring 2026
-- Class time: MWF 3:00-4:15 PM ET (20:00 UTC for standard time, 19:00 UTC for DST)
-- Semester: Jan 12, 2026 - May 1, 2026
-- Spring Break: March 9-13, 2026 (skip this week)
-- MLK Day: January 19, 2026 (mark as cancelled)

DO $$
DECLARE
  course_uuid UUID := 'a0000000-0000-0000-0000-000000000070';
  current_date_var DATE := '2026-01-12';
  end_date_var DATE := '2026-05-01';
  week_num INT := 1;
  day_of_week INT;
  session_title TEXT;
  session_time TIMESTAMPTZ;
  is_spring_break BOOLEAN;
  is_mlk_day BOOLEAN;
BEGIN
  -- Loop through each day of the semester
  WHILE current_date_var <= end_date_var LOOP
    day_of_week := EXTRACT(DOW FROM current_date_var);
    
    -- Check if it's Monday (1), Wednesday (3), or Friday (5)
    IF day_of_week IN (1, 3, 5) THEN
      -- Calculate week number
      week_num := FLOOR((current_date_var - DATE '2026-01-12') / 7) + 1;
      
      -- Check for spring break (March 9-13, 2026)
      is_spring_break := current_date_var BETWEEN DATE '2026-03-09' AND DATE '2026-03-13';
      
      -- Check for MLK Day (January 19, 2026)
      is_mlk_day := current_date_var = DATE '2026-01-19';
      
      -- Skip spring break entirely
      IF NOT is_spring_break THEN
        -- Create session title based on day
        CASE day_of_week
          WHEN 1 THEN session_title := 'MUS 070 - Week ' || week_num || ' Monday';
          WHEN 3 THEN session_title := 'MUS 070 - Week ' || week_num || ' Wednesday';
          WHEN 5 THEN session_title := 'MUS 070 - Week ' || week_num || ' Friday';
        END CASE;
        
        -- Set session time (3:00 PM ET = 20:00 UTC before DST, 19:00 UTC after DST)
        -- DST starts March 8, 2026
        IF current_date_var >= DATE '2026-03-08' THEN
          session_time := current_date_var + INTERVAL '19 hours'; -- 3 PM EDT
        ELSE
          session_time := current_date_var + INTERVAL '20 hours'; -- 3 PM EST
        END IF;
        
        -- Insert the session
        INSERT INTO gw_attendance_sessions (
          course_id,
          title,
          opens_at,
          closes_at,
          status,
          mode,
          roster_scope
        ) VALUES (
          course_uuid,
          session_title,
          session_time,
          session_time + INTERVAL '75 minutes', -- 1hr 15min class
          CASE 
            WHEN is_mlk_day THEN 'cancelled'
            WHEN current_date_var < CURRENT_DATE THEN 'closed'
            ELSE 'scheduled'
          END,
          'qr',
          'enrolled_students'
        );
      END IF;
    END IF;
    
    current_date_var := current_date_var + INTERVAL '1 day';
  END LOOP;
END $$;