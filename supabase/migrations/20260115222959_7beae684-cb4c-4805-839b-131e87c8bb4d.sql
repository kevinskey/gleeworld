-- Allow system-seeded resources without user_id
ALTER TABLE public.lh100_module_resources ALTER COLUMN user_id DROP NOT NULL;

-- Seed LH100 module resources for liturgical planning
INSERT INTO public.lh100_module_resources (module_id, title, resource_type, url, duration, description, sort_order)
VALUES 
  ('lh100-week-1', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/offices/divine-worship', NULL, 'Weekly liturgy planning worksheet and guidelines', 0),
  ('lh100-week-1', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/daily-bible-reading', '20 min', 'Reflect on the Gospel message for this Sunday', 1),
  ('lh100-week-1', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2),
  ('lh100-week-2', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/offices/divine-worship', NULL, 'Weekly liturgy planning worksheet and guidelines', 0),
  ('lh100-week-2', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/daily-bible-reading', '20 min', 'Reflect on the Gospel message for this Sunday', 1),
  ('lh100-week-2', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2),
  ('lh100-week-3', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/offices/divine-worship', NULL, 'Weekly liturgy planning worksheet and guidelines', 0),
  ('lh100-week-3', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/daily-bible-reading', '20 min', 'Reflect on the Gospel message for this Sunday', 1),
  ('lh100-week-3', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2),
  ('lh100-week-4', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/offices/divine-worship', NULL, 'Weekly liturgy planning worksheet and guidelines', 0),
  ('lh100-week-4', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/daily-bible-reading', '20 min', 'Reflect on the Gospel message for this Sunday', 1),
  ('lh100-week-4', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2);