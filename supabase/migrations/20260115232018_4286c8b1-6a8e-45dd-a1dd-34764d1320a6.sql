-- Seed LH 100 module resources with proper links
-- Using module IDs from the LH100_MODULES array: lh-1, lh-2, lh-3, etc.

-- First, clear any existing resources to avoid duplicates
DELETE FROM lh100_module_resources WHERE module_id LIKE 'lh-%' OR module_id LIKE 'lh100-%';

-- Seed resources for first 4 weeks with proper USCCB readings links
-- Week 1: Second Sunday in Ordinary Time (January 18, 2026)
INSERT INTO lh100_module_resources (id, module_id, title, resource_type, url, duration, description, sort_order, readings_date, music_links)
VALUES 
  (gen_random_uuid(), 'lh-1', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet and guidelines - editable for your parish needs', 0, '2026-01-18', NULL),
  (gen_random_uuid(), 'lh-1', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/011826.cfm', '20 min', 'Second Sunday in Ordinary Time - click to read the full readings for January 18', 1, '2026-01-18', NULL),
  (gen_random_uuid(), 'lh-1', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2, '2026-01-18', 
   '{"prelude": null, "opening_song": null, "responsorial_psalm": "https://www.youtube.com/watch?v=example1", "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": "https://soundcloud.com/example-playlist"}'::jsonb);

-- Week 2: Third Sunday in Ordinary Time (January 25, 2026)
INSERT INTO lh100_module_resources (id, module_id, title, resource_type, url, duration, description, sort_order, readings_date, music_links)
VALUES 
  (gen_random_uuid(), 'lh-2', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet and guidelines - editable for your parish needs', 0, '2026-01-25', NULL),
  (gen_random_uuid(), 'lh-2', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/012526.cfm', '20 min', 'Third Sunday in Ordinary Time - click to read the full readings for January 25', 1, '2026-01-25', NULL),
  (gen_random_uuid(), 'lh-2', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2, '2026-01-25', 
   '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb);

-- Week 3: Fourth Sunday in Ordinary Time (February 1, 2026)
INSERT INTO lh100_module_resources (id, module_id, title, resource_type, url, duration, description, sort_order, readings_date, music_links)
VALUES 
  (gen_random_uuid(), 'lh-3', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet and guidelines - editable for your parish needs', 0, '2026-02-01', NULL),
  (gen_random_uuid(), 'lh-3', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/020126.cfm', '20 min', 'Fourth Sunday in Ordinary Time - click to read the full readings for February 1', 1, '2026-02-01', NULL),
  (gen_random_uuid(), 'lh-3', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2, '2026-02-01', 
   '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb);

-- Week 4: Fifth Sunday in Ordinary Time (February 8, 2026)
INSERT INTO lh100_module_resources (id, module_id, title, resource_type, url, duration, description, sort_order, readings_date, music_links)
VALUES 
  (gen_random_uuid(), 'lh-4', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet and guidelines - editable for your parish needs', 0, '2026-02-08', NULL),
  (gen_random_uuid(), 'lh-4', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/020826.cfm', '20 min', 'Fifth Sunday in Ordinary Time - click to read the full readings for February 8', 1, '2026-02-08', NULL),
  (gen_random_uuid(), 'lh-4', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2, '2026-02-08', 
   '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb);

-- Week 5: Ash Wednesday area (February 15, 2026 - potentially near Ash Wed)
INSERT INTO lh100_module_resources (id, module_id, title, resource_type, url, duration, description, sort_order, readings_date, music_links)
VALUES 
  (gen_random_uuid(), 'lh-5', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet and guidelines - editable for your parish needs', 0, '2026-02-15', NULL),
  (gen_random_uuid(), 'lh-5', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/021526.cfm', '20 min', 'Sixth Sunday in Ordinary Time - click to read the full readings', 1, '2026-02-15', NULL),
  (gen_random_uuid(), 'lh-5', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections for the celebration', 2, '2026-02-15', 
   '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb);

-- Add resources for weeks 6-10
INSERT INTO lh100_module_resources (id, module_id, title, resource_type, url, duration, description, sort_order, readings_date, music_links)
VALUES 
  (gen_random_uuid(), 'lh-6', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet', 0, '2026-02-22', NULL),
  (gen_random_uuid(), 'lh-6', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/022226.cfm', '20 min', 'Click to read the full readings of the week', 1, '2026-02-22', NULL),
  (gen_random_uuid(), 'lh-6', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections', 2, '2026-02-22', '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb),
  
  (gen_random_uuid(), 'lh-7', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet', 0, '2026-03-01', NULL),
  (gen_random_uuid(), 'lh-7', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/030126.cfm', '20 min', 'Click to read the full readings of the week', 1, '2026-03-01', NULL),
  (gen_random_uuid(), 'lh-7', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections', 2, '2026-03-01', '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb),
  
  (gen_random_uuid(), 'lh-8', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet', 0, '2026-03-08', NULL),
  (gen_random_uuid(), 'lh-8', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/030826.cfm', '20 min', 'Click to read the full readings of the week', 1, '2026-03-08', NULL),
  (gen_random_uuid(), 'lh-8', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections', 2, '2026-03-08', '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb),
  
  (gen_random_uuid(), 'lh-9', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet', 0, '2026-03-15', NULL),
  (gen_random_uuid(), 'lh-9', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/031526.cfm', '20 min', 'Click to read the full readings of the week', 1, '2026-03-15', NULL),
  (gen_random_uuid(), 'lh-9', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections', 2, '2026-03-15', '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb),
  
  (gen_random_uuid(), 'lh-10', 'Liturgy Planning Guide', 'document', 'https://www.usccb.org/resources/liturgy-planning-guide.pdf', NULL, 'Weekly liturgy planning worksheet', 0, '2026-03-22', NULL),
  (gen_random_uuid(), 'lh-10', 'Scripture Reflection', 'reading', 'https://bible.usccb.org/bible/readings/032226.cfm', '20 min', 'Click to read the full readings of the week', 1, '2026-03-22', NULL),
  (gen_random_uuid(), 'lh-10', 'Music Selection', 'audio', NULL, '15 min', 'Plan music ministry selections', 2, '2026-03-22', '{"prelude": null, "opening_song": null, "responsorial_psalm": null, "preparation_hymn": null, "communion_hymn": null, "recessional": null, "soundcloud_playlist": null}'::jsonb);