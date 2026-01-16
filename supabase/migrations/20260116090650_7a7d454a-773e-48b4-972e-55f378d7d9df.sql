-- Alter liturgical_weeks to add missing columns
ALTER TABLE public.liturgical_weeks 
ADD COLUMN IF NOT EXISTS sunday_date DATE,
ADD COLUMN IF NOT EXISTS season TEXT,
ADD COLUMN IF NOT EXISTS sunday_title TEXT,
ADD COLUMN IF NOT EXISTS liturgical_year TEXT DEFAULT 'A',
ADD COLUMN IF NOT EXISTS psalm TEXT,
ADD COLUMN IF NOT EXISTS psalm_verses TEXT,
ADD COLUMN IF NOT EXISTS psalm_refrain TEXT,
ADD COLUMN IF NOT EXISTS gospel TEXT,
ADD COLUMN IF NOT EXISTS theme TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create liturgical_music_plan table if not exists
CREATE TABLE IF NOT EXISTS public.liturgical_music_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES public.liturgical_weeks(id) ON DELETE CASCADE,
  service_order INTEGER,
  moment TEXT,
  title TEXT,
  composer TEXT,
  voicing TEXT,
  key TEXT,
  tempo TEXT,
  status TEXT DEFAULT 'planned',
  rehearsal_notes TEXT,
  performance_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liturgical_music_plan ENABLE ROW LEVEL SECURITY;

-- Create policies for liturgical_music_plan
DROP POLICY IF EXISTS "Everyone can view liturgical music plans" ON public.liturgical_music_plan;
CREATE POLICY "Everyone can view liturgical music plans"
ON public.liturgical_music_plan FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins and TAs can manage music plans" ON public.liturgical_music_plan;
CREATE POLICY "Admins and TAs can manage music plans"
ON public.liturgical_music_plan FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'teaching_assistant')
    AND is_active = true
  )
);

-- Create liturgical_media table if not exists
CREATE TABLE IF NOT EXISTS public.liturgical_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES public.liturgical_weeks(id) ON DELETE CASCADE,
  file_type TEXT,
  label TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liturgical_media ENABLE ROW LEVEL SECURITY;

-- Create policies for liturgical_media
DROP POLICY IF EXISTS "Everyone can view liturgical media" ON public.liturgical_media;
CREATE POLICY "Everyone can view liturgical media"
ON public.liturgical_media FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins and TAs can manage liturgical media" ON public.liturgical_media;
CREATE POLICY "Admins and TAs can manage liturgical media"
ON public.liturgical_media FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'teaching_assistant')
    AND is_active = true
  )
);

-- Seed liturgical_weeks with Jan 18 - Apr 26, 2026 Sundays (using existing week_of column if sunday_date fails)
INSERT INTO public.liturgical_weeks (week_of, sunday_date, sunday_title, season, psalm, psalm_verses, psalm_refrain, title, lectionary_cycle)
VALUES
('2026-01-18', '2026-01-18', '2nd Sunday OT', 'Ordinary Time', 'Psalm 40', '40:2,4,7-10', 'Here am I, Lord', '2nd Sunday OT', 'A'),
('2026-01-25', '2026-01-25', '3rd Sunday OT', 'Ordinary Time', 'Psalm 27', '27:1,4,13-14', 'The Lord is my light', '3rd Sunday OT', 'A'),
('2026-02-01', '2026-02-01', '4th Sunday OT', 'Ordinary Time', 'Psalm 146', '146:7-10', 'Blessed are the poor', '4th Sunday OT', 'A'),
('2026-02-08', '2026-02-08', '5th Sunday OT', 'Ordinary Time', 'Psalm 112', '112:4-9', 'The just man is a light', '5th Sunday OT', 'A'),
('2026-02-15', '2026-02-15', '6th Sunday OT', 'Ordinary Time', 'Psalm 119', '119:1-34', 'Blessed are they', '6th Sunday OT', 'A'),
('2026-02-22', '2026-02-22', '1st Sunday Lent', 'Lent', 'Psalm 51', '51:3-17', 'Be merciful', '1st Sunday Lent', 'A'),
('2026-03-01', '2026-03-01', '2nd Sunday Lent', 'Lent', 'Psalm 33', '33:4-22', 'Lord let your mercy', '2nd Sunday Lent', 'A'),
('2026-03-08', '2026-03-08', '3rd Sunday Lent', 'Lent', 'Psalm 95', '95:1-9', 'If today you hear', '3rd Sunday Lent', 'A'),
('2026-03-15', '2026-03-15', '4th Sunday Lent', 'Lent', 'Psalm 23', '23', 'The Lord is my shepherd', '4th Sunday Lent', 'A'),
('2026-03-22', '2026-03-22', '5th Sunday Lent', 'Lent', 'Psalm 130', '130', 'With the Lord there is mercy', '5th Sunday Lent', 'A'),
('2026-03-29', '2026-03-29', 'Palm Sunday', 'Holy Week', 'Psalm 22', '22', 'My God, my God', 'Palm Sunday', 'A'),
('2026-04-05', '2026-04-05', 'Easter Sunday', 'Easter', 'Psalm 118', '118', 'This is the day', 'Easter Sunday', 'A'),
('2026-04-12', '2026-04-12', 'Divine Mercy', 'Easter', 'Psalm 118', '118', 'Give thanks to the Lord', 'Divine Mercy Sunday', 'A'),
('2026-04-19', '2026-04-19', '3rd Sunday Easter', 'Easter', 'Psalm 16', '16', 'You will show us', '3rd Sunday Easter', 'A'),
('2026-04-26', '2026-04-26', '4th Sunday Easter', 'Easter', 'Psalm 23', '23', 'The Lord is my shepherd', '4th Sunday Easter', 'A')
ON CONFLICT (week_of) DO UPDATE SET
  sunday_date = EXCLUDED.sunday_date,
  sunday_title = EXCLUDED.sunday_title,
  season = EXCLUDED.season,
  psalm = EXCLUDED.psalm,
  psalm_verses = EXCLUDED.psalm_verses,
  psalm_refrain = EXCLUDED.psalm_refrain,
  title = EXCLUDED.title;