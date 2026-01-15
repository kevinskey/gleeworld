-- Create table for editable LH100 modules
CREATE TABLE IF NOT EXISTS public.lh100_modules (
  id TEXT PRIMARY KEY,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  learning_objectives TEXT[] DEFAULT '{}',
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lh100_modules ENABLE ROW LEVEL SECURITY;

-- Everyone can view modules
CREATE POLICY "Anyone can view lh100 modules"
ON public.lh100_modules FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can update modules
CREATE POLICY "Authenticated users can update lh100 modules"
ON public.lh100_modules FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Authenticated users can insert modules
CREATE POLICY "Authenticated users can insert lh100 modules"
ON public.lh100_modules FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can delete modules
CREATE POLICY "Authenticated users can delete lh100 modules"
ON public.lh100_modules FOR DELETE
TO authenticated
USING (true);

-- Seed the initial modules from the hardcoded data
INSERT INTO public.lh100_modules (id, week_number, title, description, start_date, end_date, is_active, is_locked, learning_objectives)
VALUES 
  ('lh-1', 1, 'Second Sunday in Ordinary Time', 'Sunday liturgical preparation and reflection.', '2026-01-18', '2026-01-18', true, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-2', 2, 'Third Sunday in Ordinary Time', 'Sunday liturgical preparation and reflection.', '2026-01-25', '2026-01-25', false, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-3', 3, 'Fourth Sunday in Ordinary Time', 'Sunday liturgical preparation and reflection.', '2026-02-01', '2026-02-01', false, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-4', 4, 'Presentation of the Lord', 'Feast day celebration and liturgical preparation.', '2026-02-02', '2026-02-02', false, false, ARRAY['Understand the significance of the Presentation', 'Prepare special feast day liturgy', 'Plan celebratory music']),
  ('lh-5', 5, 'Fifth Sunday in Ordinary Time', 'Sunday liturgical preparation and reflection.', '2026-02-08', '2026-02-08', false, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-6', 6, 'Sixth Sunday in Ordinary Time', 'Sunday liturgical preparation and reflection.', '2026-02-15', '2026-02-15', false, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-7', 7, 'Ash Wednesday', 'Beginning of Lent - Major observance preparation.', '2026-02-18', '2026-02-18', false, false, ARRAY['Understand the significance of Ash Wednesday', 'Prepare penitential liturgy', 'Plan Lenten music selections']),
  ('lh-8', 8, 'First Sunday of Lent', 'Sunday liturgical preparation and reflection.', '2026-02-22', '2026-02-22', false, false, ARRAY['Enter into the Lenten spirit', 'Prepare readings for First Sunday of Lent', 'Plan penitential music']),
  ('lh-9', 9, 'Second Sunday of Lent', 'Sunday liturgical preparation and reflection.', '2026-03-01', '2026-03-01', false, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-10', 10, 'Third Sunday of Lent', 'Sunday liturgical preparation and reflection.', '2026-03-08', '2026-03-08', false, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-11', 11, 'Fourth Sunday of Lent (Laetare)', 'Rose vestments - Joyful mid-Lent celebration.', '2026-03-15', '2026-03-15', false, false, ARRAY['Understand the significance of Laetare Sunday', 'Prepare readings highlighting joy', 'Plan appropriately joyful music']),
  ('lh-12', 12, 'Fifth Sunday of Lent', 'Sunday liturgical preparation and reflection.', '2026-03-22', '2026-03-22', false, false, ARRAY['Prepare readings and prayers for Sunday liturgy', 'Reflect on the Gospel message', 'Plan music ministry for the celebration']),
  ('lh-13', 13, 'Palm Sunday', 'Beginning of Holy Week.', '2026-03-29', '2026-03-29', false, false, ARRAY['Prepare for the Passion narrative', 'Plan processional music', 'Coordinate palm distribution']),
  ('lh-14', 14, 'Holy Thursday', 'Mass of the Lords Supper.', '2026-04-02', '2026-04-02', false, false, ARRAY['Prepare for the Holy Thursday liturgy', 'Plan foot washing ceremony music', 'Prepare Eucharistic music']),
  ('lh-15', 15, 'Good Friday', 'Passion of the Lord.', '2026-04-03', '2026-04-03', false, false, ARRAY['Prepare for the Good Friday service', 'Plan veneration of the Cross music', 'Prepare solemn intercessions']),
  ('lh-16', 16, 'Easter Vigil / Easter Sunday', 'The Resurrection of the Lord.', '2026-04-04', '2026-04-05', false, false, ARRAY['Prepare for the Easter Vigil', 'Plan joyful Easter music', 'Coordinate with RCIA team'])
ON CONFLICT (id) DO NOTHING;