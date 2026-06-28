-- CP4: link a gw_sheet_music row back to the pd_works catalog entry it
-- was added from. Two reasons:
--   1. Dedupe: a tenant who already added a CPDL work shouldn't get a
--      second copy on a second click.
--   2. Provenance: surfaces "this came from CPDL, see source page" in
--      the Music Library without forcing the librarian to retype.
--
-- The column is nullable — pre-existing tenant-uploaded scores have no
-- pd_works origin and that's fine. ON DELETE SET NULL keeps a score
-- safe if a pd_works row is ever soft-deleted (the cached PDF in the
-- tenant's library stays usable; the link just goes dark).

ALTER TABLE gw_sheet_music
  ADD COLUMN IF NOT EXISTS pd_work_id uuid
    REFERENCES pd_works(id) ON DELETE SET NULL;

-- Partial unique index — one row per (tenant, pd_work) so the add-to-
-- library RPC can do ON CONFLICT DO NOTHING idempotently.
CREATE UNIQUE INDEX IF NOT EXISTS gw_sheet_music_tenant_pd_work_uidx
  ON gw_sheet_music (tenant_id, pd_work_id)
  WHERE pd_work_id IS NOT NULL;
