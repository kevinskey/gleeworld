-- Worship aid: the printable folded program generated from a Mass plan.
--
-- One JSONB column rather than a dozen scalar ones. Everything here is
-- presentation for a single printed artifact — cover art, the season word,
-- the boxed notices, the images a user drops into a panel — and it is edited
-- and saved as one object. Splitting it into columns would mean a migration
-- every time a parish wants another line on the cover, and none of it is ever
-- queried or filtered on.
--
-- The liturgical CONTENT is not duplicated here: readings, hymn titles and
-- the psalm already live in their own columns on this row and are read from
-- there, so a plan edited after the aid is designed still prints correctly.

ALTER TABLE public.gw_liturgy_masses
  ADD COLUMN IF NOT EXISTS worship_aid JSONB;

COMMENT ON COLUMN public.gw_liturgy_masses.worship_aid IS
  'Presentation settings for the printed worship aid: cover title/art, season '
  'word, spine text, boxed notices, and per-panel images. Liturgical content '
  'is read from this row''s own columns, never copied in here.';

NOTIFY pgrst, 'reload schema';
