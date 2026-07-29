-- Repertoire Phase 3 — real Add-to-Library.
--
-- Widens gw_personal_scores + gw_sheet_music to accept saves from
-- external repertoire sources (IMSLP today; JWP/SMP in Phase 2). Both
-- tables already link to pd_works via pd_work_id; we mirror that with
-- ext_catalog_item_id for anything sourced from ext_catalog_items.
--
-- For sources we haven't fetched a cachable PDF for (IMSLP: 15-second
-- countdown blocks automated download), gw_personal_scores now allows
-- storage_path=NULL if external_url is set — the client renders a
-- "Download from source" button instead of a PDF viewer.

-- 1) gw_personal_scores — support external repertoire sources
DO $$
BEGIN
  -- source CHECK: allow 'imslp' and 'external' in addition to existing values.
  ALTER TABLE gw_personal_scores
    DROP CONSTRAINT IF EXISTS gw_personal_scores_source_check;
  ALTER TABLE gw_personal_scores
    ADD CONSTRAINT gw_personal_scores_source_check
    CHECK (source IN ('upload', 'cpdl', 'purchase', 'imslp', 'external'));
END $$;

-- storage_path was NOT NULL — external saves may not have a cached PDF.
ALTER TABLE gw_personal_scores
  ALTER COLUMN storage_path DROP NOT NULL;

-- New: link to ext_catalog_items for IMSLP/JWP/SMP-sourced saves.
ALTER TABLE gw_personal_scores
  ADD COLUMN IF NOT EXISTS ext_catalog_item_id uuid
    REFERENCES ext_catalog_items(id) ON DELETE SET NULL;

-- New: external URL when we don't cache the PDF ourselves.
ALTER TABLE gw_personal_scores
  ADD COLUMN IF NOT EXISTS external_url text;

-- Dedupe: one save per user per external item.
CREATE UNIQUE INDEX IF NOT EXISTS gw_personal_scores_ext_uq
  ON gw_personal_scores (user_id, ext_catalog_item_id)
  WHERE ext_catalog_item_id IS NOT NULL;

-- Every row must be reachable somehow: bucket path OR external URL.
DO $$
BEGIN
  ALTER TABLE gw_personal_scores
    DROP CONSTRAINT IF EXISTS gw_personal_scores_reachable_chk;
  ALTER TABLE gw_personal_scores
    ADD CONSTRAINT gw_personal_scores_reachable_chk
    CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL);
END $$;

-- 2) gw_sheet_music — mirror pattern for tenant library saves
ALTER TABLE gw_sheet_music
  ADD COLUMN IF NOT EXISTS ext_catalog_item_id uuid
    REFERENCES ext_catalog_items(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gw_sheet_music_tenant_ext_uidx
  ON gw_sheet_music (tenant_id, ext_catalog_item_id)
  WHERE ext_catalog_item_id IS NOT NULL;
