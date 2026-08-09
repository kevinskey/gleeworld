-- Draft block positions were never renumbered, because the editor's
-- persistPositions() skipped every write (it compared against an array the
-- caller had already renumbered, so its "has this changed?" test was always
-- false). Reordering never reached the DB, and positions drifted into
-- whatever the original inserts happened to produce.
--
-- Kevin's World, before this migration:
--   header 0, hero 1, appointment-booking 5, music-player 6, videos 6,
--   concert-rsvp 9, audition 10, contact 11
--
-- Note the gaps and the DUPLICATE 6. The editor reads blocks with
-- `.order('position')`, and Postgres does not promise a stable order for
-- ties, so music-player and videos could swap places between page loads
-- with nothing having changed.
--
-- Renumber contiguously from 0, per tenant. Ordering by (position,
-- created_at) preserves the order tenants currently see and only breaks the
-- ties deterministically — this migration must not rearrange anyone's page.

WITH renumbered AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY tenant_id
           ORDER BY position, created_at, id
         ) - 1 AS new_position
  FROM public.gw_site_blocks
)
UPDATE public.gw_site_blocks b
   SET position = r.new_position
  FROM renumbered r
 WHERE b.id = r.id
   AND b.position IS DISTINCT FROM r.new_position;
