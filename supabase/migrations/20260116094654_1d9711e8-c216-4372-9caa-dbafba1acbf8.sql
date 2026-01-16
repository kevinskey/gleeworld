-- Clean up test channels and fix sort order
DELETE FROM gw_radio_channels WHERE name IN ('A1', 'A2', 'S1', 'S2');

-- Reorder channels properly
UPDATE gw_radio_channels SET sort_order = 1 WHERE name = 'Glee World Radio';
UPDATE gw_radio_channels SET sort_order = 2 WHERE name = '99th Annual Christmas Carol';
UPDATE gw_radio_channels SET sort_order = 3 WHERE name = 'Alumni and Archives';
UPDATE gw_radio_channels SET sort_order = 4 WHERE name = 'Amaze and Inspire';
UPDATE gw_radio_channels SET sort_order = 5 WHERE name = 'Christmas';
UPDATE gw_radio_channels SET sort_order = 6 WHERE name = 'Conducting';
UPDATE gw_radio_channels SET sort_order = 7 WHERE name = 'Gospel';
UPDATE gw_radio_channels SET sort_order = 8 WHERE name = 'Hip Hop Mass';
UPDATE gw_radio_channels SET sort_order = 9 WHERE name = 'Negro Spirituals';
UPDATE gw_radio_channels SET sort_order = 10 WHERE name = 'Sisters in Song';
UPDATE gw_radio_channels SET sort_order = 11 WHERE name = 'Survey of African American Music';
UPDATE gw_radio_channels SET sort_order = 12 WHERE name = 'Tour Radio';
UPDATE gw_radio_channels SET sort_order = 13 WHERE name = 'Rehearsals';
UPDATE gw_radio_channels SET sort_order = 14 WHERE name = 'Interviews';
UPDATE gw_radio_channels SET sort_order = 15 WHERE name = 'Specials - Live Events';
UPDATE gw_radio_channels SET sort_order = 16 WHERE name = 'Serenbe - WABE Emmy Nominated Film';
UPDATE gw_radio_channels SET sort_order = 17 WHERE name = 'Exec Board';
UPDATE gw_radio_channels SET sort_order = 18 WHERE name = 'Glee 1973';

-- Set Glee World Radio as default
UPDATE gw_radio_channels SET is_default = false WHERE is_default = true;
UPDATE gw_radio_channels SET is_default = true WHERE name = 'Glee World Radio';