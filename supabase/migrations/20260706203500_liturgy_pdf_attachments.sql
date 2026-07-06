-- Attach a PDF (sheet music, order-of-service extract, etc.) to each
-- song slot on the Liturgy Planner. One PDF per slot for v1 — same
-- shape as *_title + *_youtube. URLs point at the `sheet-music` bucket
-- (Supabase Storage), same bucket the Music Library already uses.
ALTER TABLE gw_liturgy_masses
  ADD COLUMN IF NOT EXISTS setting_pdf       text,
  ADD COLUMN IF NOT EXISTS prelude_pdf       text,
  ADD COLUMN IF NOT EXISTS opening_pdf       text,
  ADD COLUMN IF NOT EXISTS psalm_pdf         text,
  ADD COLUMN IF NOT EXISTS preparation_pdf   text,
  ADD COLUMN IF NOT EXISTS communion_1_pdf   text,
  ADD COLUMN IF NOT EXISTS communion_2_pdf   text,
  ADD COLUMN IF NOT EXISTS praise_pdf        text,
  ADD COLUMN IF NOT EXISTS closing_pdf       text;
