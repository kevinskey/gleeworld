-- Fix missing course codes for active courses
UPDATE gw_courses SET code = 'MUS-070' WHERE id = 'a0000000-0000-0000-0000-000000000070' AND code IS NULL;
UPDATE gw_courses SET code = 'GLEE-000' WHERE id = '025f229b-e8e9-4e13-8e76-c6504cca0a30' AND code IS NULL;
UPDATE gw_courses SET code = 'MUS-001' WHERE id = 'eb10a88e-7d5b-4a69-b508-d724b2d8d502' AND code IS NULL;
UPDATE gw_courses SET code = 'GLEE-101' WHERE id = 'b9c43732-b3c7-4292-b43c-104a80c0b4dd' AND code IS NULL;

-- Verify all calendars exist for courses that need them
-- MUS-070 should use calendar 7053fa69-0d24-45c2-bd42-b191b5460e83
-- GLEE-000 should use calendar 5b7ca37c-f5bd-4635-a6d0-357634ee81e6
-- MUS-001 should use calendar 2004a012-cce6-4fae-89eb-d95669992456
-- GLEE-101 should use calendar 1d8e2b25-c191-4a4b-addd-a0be37a9e50f

-- Also add calendar_id column to gw_courses if not exists and link courses to their calendars
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'gw_courses' AND column_name = 'calendar_id'
  ) THEN
    ALTER TABLE gw_courses ADD COLUMN calendar_id UUID REFERENCES gw_calendars(id);
  END IF;
END $$;

-- Link courses to their specific calendars
UPDATE gw_courses SET calendar_id = '7053fa69-0d24-45c2-bd42-b191b5460e83' WHERE id = 'a0000000-0000-0000-0000-000000000070';
UPDATE gw_courses SET calendar_id = '5b7ca37c-f5bd-4635-a6d0-357634ee81e6' WHERE id = '025f229b-e8e9-4e13-8e76-c6504cca0a30';
UPDATE gw_courses SET calendar_id = '2004a012-cce6-4fae-89eb-d95669992456' WHERE id = 'eb10a88e-7d5b-4a69-b508-d724b2d8d502';
UPDATE gw_courses SET calendar_id = '1d8e2b25-c191-4a4b-addd-a0be37a9e50f' WHERE id = 'b9c43732-b3c7-4292-b43c-104a80c0b4dd';
UPDATE gw_courses SET calendar_id = '9b0267e7-5b30-4288-b33f-99a056279011' WHERE id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';
UPDATE gw_courses SET calendar_id = '582d666c-a6b4-421c-a6d8-04d6e62e9786' WHERE id = '2026c613-bda7-487a-a5d9-91e57c26a741';
UPDATE gw_courses SET calendar_id = 'a0000000-0000-0000-0000-000000000100' WHERE id = 'a0000000-0000-0000-0000-000000000100';