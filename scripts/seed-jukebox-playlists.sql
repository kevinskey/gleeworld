-- Recreate the SoundCloud sets as Jukebox playlists for the Yo-Doc tenant
-- (slug 'kevin'), from the 2026-10-05 set fetch. Idempotent: playlists are
-- matched by title, memberships by their primary key. Tracks a set contains
-- that are not in gw_jukebox_tracks (reposts of other accounts' tracks)
-- are skipped by the JOIN. Run after seed-jukebox-tracks.sql.

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'New new'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'New new')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'New new'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (2262601664, 1), (2262609149, 2), (2262609251, 3), (2262609341, 4), (2262609428, 5)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'SCGC Cenennial Concert - Kansas City'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Cenennial Concert - Kansas City')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Cenennial Concert - Kansas City'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (2055464228, 1), (2055464196, 2), (2055464252, 3), (2055464232, 4), (2055464248, 5), (2055464204, 6), (2055464236, 7), (2055603408, 8), (2055464220, 9), (2055603816, 10), (2055464216, 11), (2055464240, 12), (2069649744, 13), (2055464224, 14), (2055464256, 15), (2055464200, 16), (2055464208, 17)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'SCGC Centennial Tour Concert - Kansas City'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Centennial Tour Concert - Kansas City')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Centennial Tour Concert - Kansas City'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (2055464228, 1), (2055464196, 2), (2055464252, 3), (2055464232, 4), (2055464248, 5), (2055464204, 6), (2055464236, 7), (2055464244, 8), (2055464220, 9), (2055464216, 10), (2055464240, 11), (2055464224, 12), (2055464256, 13), (2055464200, 14), (2055464208, 15), (2055603816, 16), (2055603408, 17)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'The Hip Hop Mass'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'The Hip Hop Mass')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'The Hip Hop Mass'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (1876242303, 1), (1884766008, 2), (1876242291, 3), (1901075601, 4), (1876242285, 5), (1876242279, 6), (1876242276, 7), (1876242267, 8)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'SCGC ACDA Southern Regional Conference 2018'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC ACDA Southern Regional Conference 2018')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC ACDA Southern Regional Conference 2018'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (1292289349, 1), (1292289334, 2), (1292289331, 3), (1292289322, 4), (1292289319, 5)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Substack'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Substack')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Substack'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (1278064033, 1)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Dr. Kevin Johnson / Spelman Choral Series'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Dr. Kevin Johnson / Spelman Choral Series')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Dr. Kevin Johnson / Spelman Choral Series'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (1198390321, 1), (1198390315, 2), (1198390312, 3), (1198390309, 4), (1198390306, 5), (1198390300, 6), (1198390285, 7), (1198390279, 8), (1198390270, 9), (1198390267, 10), (1198390264, 11)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Wade in the Water TTBB Practice Tracks'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Wade in the Water TTBB Practice Tracks')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Wade in the Water TTBB Practice Tracks'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (1189924570, 1), (1189924567, 2), (1189924561, 3), (1189924558, 4), (1189924549, 5), (1189924543, 6), (1189924540, 7)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Preacher''s Mass 2020'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Preacher''s Mass 2020')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Preacher''s Mass 2020'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (883344505, 1), (883344502, 2)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Summer 2020'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Summer 2020')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Summer 2020'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (880312333, 1), (885613087, 2), (888643525, 3)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Atlanta Ballet'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Atlanta Ballet')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Atlanta Ballet'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (744298939, 1), (744298921, 2), (744298915, 3), (744298909, 4), (744298897, 5), (744298888, 6), (744298885, 7), (744298882, 8), (744298873, 9), (744298930, 10), (744298924, 11)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', '2020'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = '2020')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = '2020'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (739955131, 1), (903702091, 2), (931635433, 3)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Mass 8-20-2017'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Mass 8-20-2017')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Mass 8-20-2017'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (338635072, 1), (338635070, 2), (338635069, 3), (338635067, 4), (338635066, 5), (338635063, 6)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'SCGC Hi Fidelity Recordings'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Hi Fidelity Recordings')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Hi Fidelity Recordings'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (230770613, 1), (230770606, 2), (230770600, 3)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Psalms for the Church Year vol. 2'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Psalms for the Church Year vol. 2')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Psalms for the Church Year vol. 2'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (190720085, 1), (190720074, 2), (190720072, 3), (190720068, 4), (190720064, 5), (190720058, 6), (190720053, 7), (190720028, 8), (190720009, 9), (190720002, 10), (190719995, 11), (190719985, 12), (190719954, 13), (190719951, 14), (190719941, 15), (190719928, 16), (190719920, 17), (190719910, 18), (190719900, 19)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Psalms for the Church Year vol. 1'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Psalms for the Church Year vol. 1')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Psalms for the Church Year vol. 1'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (190720250, 1), (190720236, 2), (190720224, 3), (190720206, 4), (190720199, 5), (190720197, 6), (190720195, 7), (190720192, 8), (190720186, 9), (190720168, 10), (190720147, 11), (190720115, 12), (190720113, 13), (190720095, 14), (190720086, 15), (190720078, 16), (190720070, 17), (190720066, 18), (190720032, 19), (190720025, 20)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Psalms for the Church Year vol. 3'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Psalms for the Church Year vol. 3')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Psalms for the Church Year vol. 3'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (190719841, 1), (190719855, 2), (190719867, 3), (190719870, 4), (190719872, 5), (190719878, 6), (190719881, 7), (190719892, 8), (190719895, 9), (190719904, 10), (190719909, 11), (190719925, 12), (190719949, 13), (190719963, 14), (190719983, 15), (190719987, 16), (190719998, 17), (190720026, 18), (190720035, 19)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Christmas Carol 2014'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Christmas Carol 2014')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Christmas Carol 2014'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (181205308, 1), (181205306, 2), (181205299, 3), (181205297, 4), (181205294, 5), (181205292, 6), (181205291, 7), (181205290, 8), (181205289, 9), (181205286, 10), (181205284, 11), (181205281, 12), (181205278, 13), (181205276, 14), (181205274, 15), (181205271, 16), (181205269, 17), (181205267, 18), (181205265, 19), (181205264, 20), (181205261, 21), (181205257, 22), (181205255, 23), (181205249, 24), (181205247, 25), (181205245, 26), (181205242, 27), (181205239, 28), (181205236, 29), (181205234, 30), (181205231, 31)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'SCGC - Amaze and Inspire'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC - Amaze and Inspire')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC - Amaze and Inspire'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (177802561, 1), (177802607, 2), (177802207, 3), (177805244, 4), (177804992, 5), (177804585, 6), (177805342, 7), (177805080, 8), (177806520, 9), (177807529, 10), (177807067, 11), (177806877, 12), (177807492, 13)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Sing We Know of Christmas'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Sing We Know of Christmas')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Sing We Know of Christmas'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (158111847, 1), (158111845, 2), (158111843, 3), (158111841, 4), (158111840, 5), (158111839, 6), (158111833, 7), (158111829, 8), (158111827, 9), (158111882, 10), (158111824, 11), (158111822, 12), (158111810, 13), (158114104, 14), (158113502, 15), (158114074, 16), (158112666, 17)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'African American Catholic Composers Concert CD Preview'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'African American Catholic Composers Concert CD Preview')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'African American Catholic Composers Concert CD Preview'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (155683312, 1), (155683306, 2), (155683316, 3), (155683270, 4), (155683111, 5), (155683293, 6), (155683153, 7), (155683193, 8), (155683158, 9), (155683178, 10), (155682946, 11), (155683007, 12), (155683008, 13), (155683010, 14), (155683063, 15), (155682942, 16), (155682967, 17), (155682947, 18), (155682953, 19), (155682957, 20), (155682959, 21), (155682964, 22), (155682965, 23)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'SCGC Negro Spirituals'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Negro Spirituals')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'SCGC Negro Spirituals'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (163097611, 1), (163097615, 2), (163097623, 3), (163097627, 4), (163097618, 5), (163097612, 6), (163097620, 7), (163097616, 8), (163097626, 9), (163097617, 10), (163097621, 11), (163097614, 12), (163097619, 13), (163097613, 14), (163097622, 15)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Songs from 2008'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Songs from 2008')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Songs from 2008'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (150637405, 1), (150637351, 2), (150637352, 3), (150636997, 4), (150636903, 5), (150636892, 6), (150636555, 7), (150636533, 8), (150636477, 9), (150636420, 10), (150636249, 11), (150634292, 12), (150634290, 13), (150636242, 14), (150635399, 15), (150635389, 16), (150635276, 17)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Pearls of Wisdom'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Pearls of Wisdom')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Pearls of Wisdom'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (150634246, 1), (150634245, 2), (150634243, 3), (150634242, 4), (150634239, 5), (150634234, 6), (150634232, 7), (150634228, 8), (150634223, 9), (150634290, 10), (150634229, 11), (150634292, 12)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Sounds from Thursday Evening Rehearsals (it''s rough ya''ll)'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Sounds from Thursday Evening Rehearsals (it''s rough ya''ll)')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Sounds from Thursday Evening Rehearsals (it''s rough ya''ll)'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (149875709, 1), (149760519, 2), (149875700, 3), (149875706, 4)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Ceremony of Carols - SCGC Latest Project 2014'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Ceremony of Carols - SCGC Latest Project 2014')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Ceremony of Carols - SCGC Latest Project 2014'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (147998502, 1), (147998503, 2), (147998504, 3), (147998505, 4), (147998507, 5), (147998508, 6), (147998509, 7), (147998510, 8), (147998511, 9), (147998512, 10), (147998513, 11)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Soulful Lenten Mass'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Soulful Lenten Mass')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Soulful Lenten Mass'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (146702542, 1), (146702543, 2), (146702544, 3), (146702545, 4), (146702546, 5), (146702547, 6), (146702548, 7), (146702549, 8)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'The Preacher''s Mass'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'The Preacher''s Mass')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'The Preacher''s Mass'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (146701231, 1), (146701239, 2), (146701187, 3), (146701425, 4), (146701444, 5), (146701476, 6), (146701419, 7), (146701481, 8), (146701606, 9)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;

WITH ins AS (
  INSERT INTO public.gw_jukebox_playlists (tenant_id, title)
  SELECT '364cc4db-68d6-4b7e-bed1-94166a1f2deb', 'Adamski Jazz Mass'
  WHERE NOT EXISTS (SELECT 1 FROM public.gw_jukebox_playlists
                     WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Adamski Jazz Mass')
  RETURNING id
), pid AS (
  SELECT id FROM ins
  UNION
  SELECT id FROM public.gw_jukebox_playlists
   WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND title = 'Adamski Jazz Mass'
)
INSERT INTO public.gw_jukebox_playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM pid LIMIT 1), t.id, v.pos
FROM (VALUES (146701009, 1), (146701007, 2), (146701006, 3), (146701003, 4), (146701002, 5), (146700998, 6), (146701089, 7), (146701065, 8), (2095500516, 9)) AS v(sid, pos)
JOIN public.gw_jukebox_tracks t
  ON t.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb' AND t.source = 'soundcloud' AND t.source_id = v.sid
ON CONFLICT DO NOTHING;
