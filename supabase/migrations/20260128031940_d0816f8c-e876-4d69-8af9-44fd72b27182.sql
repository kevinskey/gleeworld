-- Fix attendance sessions for Spring 2026
-- Semester starts January 14, 2026

-- 1. Delete all MUS 070 sessions and recreate with correct time (5:00-6:15 PM ET)
DELETE FROM gw_attendance_sessions WHERE course_id = 'a0000000-0000-0000-0000-000000000070';

-- 2. Delete MUS 240 sessions before Jan 14 (Jan 12-13 shouldn't exist)
DELETE FROM gw_attendance_sessions 
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND opens_at < '2026-01-14 00:00:00+00';

-- 3. Create MUS 070 MWF sessions (5:00-6:15 PM ET = 22:00 UTC EST, 21:00 UTC EDT)
DO $$
DECLARE
  course_uuid UUID := 'a0000000-0000-0000-0000-000000000070';
  current_date_var DATE := '2026-01-14';
  end_date_var DATE := '2026-05-01';
  week_num INT := 1;
  day_of_week INT;
  session_title TEXT;
  session_time TIMESTAMPTZ;
  is_spring_break BOOLEAN;
  is_mlk_day BOOLEAN;
BEGIN
  WHILE current_date_var <= end_date_var LOOP
    day_of_week := EXTRACT(DOW FROM current_date_var);
    
    -- Monday (1), Wednesday (3), Friday (5)
    IF day_of_week IN (1, 3, 5) THEN
      week_num := FLOOR((current_date_var - DATE '2026-01-14') / 7) + 1;
      is_spring_break := current_date_var BETWEEN DATE '2026-03-09' AND DATE '2026-03-13';
      is_mlk_day := current_date_var = DATE '2026-01-20';
      
      IF NOT is_spring_break THEN
        CASE day_of_week
          WHEN 1 THEN session_title := 'MUS 070 - Week ' || week_num || ' Monday';
          WHEN 3 THEN session_title := 'MUS 070 - Week ' || week_num || ' Wednesday';
          WHEN 5 THEN session_title := 'MUS 070 - Week ' || week_num || ' Friday';
        END CASE;
        
        -- 5:00 PM ET = 22:00 UTC (EST) or 21:00 UTC (EDT after March 8)
        IF current_date_var >= DATE '2026-03-08' THEN
          session_time := current_date_var + INTERVAL '21 hours';
        ELSE
          session_time := current_date_var + INTERVAL '22 hours';
        END IF;
        
        INSERT INTO gw_attendance_sessions (
          course_id, title, opens_at, closes_at, status, mode, roster_scope
        ) VALUES (
          course_uuid, session_title, session_time,
          session_time + INTERVAL '75 minutes',
          CASE 
            WHEN is_mlk_day THEN 'cancelled'
            WHEN current_date_var < CURRENT_DATE THEN 'closed'
            ELSE 'scheduled'
          END,
          'qr', 'enrolled_students'
        );
      END IF;
    END IF;
    current_date_var := current_date_var + INTERVAL '1 day';
  END LOOP;
END $$;

-- 4. Create MUS 210 MW sessions (2:00-2:50 PM ET = 19:00 UTC EST, 18:00 UTC EDT)
DO $$
DECLARE
  course_uuid UUID := '2026c613-bda7-487a-a5d9-91e57c26a741';
  current_date_var DATE := '2026-01-14';
  end_date_var DATE := '2026-05-01';
  week_num INT := 1;
  day_of_week INT;
  session_title TEXT;
  session_time TIMESTAMPTZ;
  is_spring_break BOOLEAN;
  is_mlk_day BOOLEAN;
BEGIN
  WHILE current_date_var <= end_date_var LOOP
    day_of_week := EXTRACT(DOW FROM current_date_var);
    
    -- Monday (1) and Wednesday (3) ONLY for MUS 210
    IF day_of_week IN (1, 3) THEN
      week_num := FLOOR((current_date_var - DATE '2026-01-14') / 7) + 1;
      is_spring_break := current_date_var BETWEEN DATE '2026-03-09' AND DATE '2026-03-13';
      is_mlk_day := current_date_var = DATE '2026-01-20';
      
      IF NOT is_spring_break THEN
        CASE day_of_week
          WHEN 1 THEN session_title := 'MUS 210 - Week ' || week_num || ' Monday';
          WHEN 3 THEN session_title := 'MUS 210 - Week ' || week_num || ' Wednesday';
        END CASE;
        
        -- 2:00 PM ET = 19:00 UTC (EST) or 18:00 UTC (EDT after March 8)
        IF current_date_var >= DATE '2026-03-08' THEN
          session_time := current_date_var + INTERVAL '18 hours';
        ELSE
          session_time := current_date_var + INTERVAL '19 hours';
        END IF;
        
        INSERT INTO gw_attendance_sessions (
          course_id, title, opens_at, closes_at, status, mode, roster_scope
        ) VALUES (
          course_uuid, session_title, session_time,
          session_time + INTERVAL '50 minutes',
          CASE 
            WHEN is_mlk_day THEN 'cancelled'
            WHEN current_date_var < CURRENT_DATE THEN 'closed'
            ELSE 'scheduled'
          END,
          'qr', 'enrolled_students'
        );
      END IF;
    END IF;
    current_date_var := current_date_var + INTERVAL '1 day';
  END LOOP;
END $$;