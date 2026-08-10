-- The congregation's copy of the worship aid gets the psalm's MUSIC, not a
-- picture of it taken months ago.
--
-- The phone page had the same bug the printed page did: it drew
-- worship_aid->>'psalmImageUrl', a JPEG engraved and uploaded at the moment
-- the setting was saved. Fixing the engraver cannot change a file that
-- already exists, so every improvement to the notation looked like it had not
-- worked — on the surface most people actually see.
--
-- The printed page fixed this by engraving gw_sheet_music.xml_content afresh
-- when the aid is built. The phone page cannot do that on its own: it is
-- anonymous, and gw_sheet_music is closed to anon except for
-- `is_public = true AND is_archived = false` rows inside anon_tenant_id() —
-- and every psalm setting in the database has is_public = false (checked
-- against pg_policies and the rows themselves, not inferred). So the MusicXML
-- has to travel through the same curated projection the rest of the aid does.
--
-- WHAT IS AND IS NOT EXPOSED
--
-- Only the psalm setting this Mass explicitly points at, and only when the
-- Mass has been published. worship_aid is a JSON column the plan's owner can
-- write anything into, so psalmScoreId is treated as untrusted input: the
-- join is additionally constrained to the Mass's OWN tenant and to rows
-- tagged as responsorial psalms. Without those, publishing a Mass with a
-- hand-edited psalmScoreId would read any score in the database through a
-- SECURITY DEFINER function. Compared as text rather than cast to uuid so a
-- malformed value returns nothing instead of raising 22P02 and taking the
-- whole page down.
--
-- The MusicXML is not a new disclosure: it is the notation of the psalm the
-- aid already prints, on a page a QR code on the printed program leads to.
--
-- Matching by TITLE is deliberately not done here. That fuzzy match lives in
-- the editor, in TypeScript, where a wrong guess is visible in a preview
-- before anything is published; the same guess in SQL would silently hand a
-- congregation another Sunday's psalm. A Mass with no psalmScoreId therefore
-- gets NULL here and the page falls back to the stored image, then to the
-- prose psalm, exactly as it does today.

-- The return type gains a column, so REPLACE cannot do it.
DROP FUNCTION IF EXISTS public.gw_worship_aid_by_token(UUID);

CREATE FUNCTION public.gw_worship_aid_by_token(p_token UUID)
RETURNS TABLE (
  mass_date DATE,
  mass_time TIME,
  observation TEXT,
  liturgical_season TEXT,
  sunday_cycle TEXT,
  setting_title TEXT,
  prelude_title TEXT,
  opening_title TEXT,
  psalm_title TEXT,
  responsorial_psalm TEXT,
  psalm_full TEXT,
  psalm_xml TEXT,
  preparation_title TEXT,
  communion_1_title TEXT,
  communion_2_title TEXT,
  praise_title TEXT,
  closing_title TEXT,
  first_reading TEXT,
  second_reading TEXT,
  gospel_acclamation TEXT,
  gospel TEXT,
  worship_aid JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Note what is NOT selected: notes, owner_user_id, tenant_id, the *_pdf and
  -- *_youtube working links. A congregation gets the program, not the plan.
  SELECT
    m.mass_date, m.mass_time, m.observation,
    m.liturgical_season::text, m.sunday_cycle::text,
    m.setting_title, m.prelude_title, m.opening_title,
    m.psalm_title, m.responsorial_psalm, m.psalm_full,
    (
      SELECT s.xml_content
      FROM public.gw_sheet_music s
      WHERE s.id::text = m.worship_aid->>'psalmScoreId'
        AND s.tenant_id IS NOT DISTINCT FROM m.tenant_id
        AND s.tags @> ARRAY['responsorial-psalm']
      LIMIT 1
    ) AS psalm_xml,
    m.preparation_title, m.communion_1_title, m.communion_2_title,
    m.praise_title, m.closing_title,
    m.first_reading, m.second_reading, m.gospel_acclamation, m.gospel,
    m.worship_aid
  FROM public.gw_liturgy_masses m
  WHERE p_token IS NOT NULL
    AND m.share_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.gw_worship_aid_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_worship_aid_by_token(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.gw_worship_aid_by_token(UUID) IS
  'Public read of a published worship aid by capability token. Returns a '
  'curated projection only; never exposes notes, owner, tenant or work links. '
  'psalm_xml is the MusicXML of the setting the Mass points at, scoped to the '
  'Mass''s own tenant and to responsorial-psalm rows, so the phone edition can '
  'engrave the psalm at read time instead of printing a stale raster.';

NOTIFY pgrst, 'reload schema';
