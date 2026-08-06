-- Put the RSVP form on kevin.gleeworld.org.
--
-- Three things:
--   1. add the `concert-rsvp` block to the draft site,
--   2. point the existing hero button ("RSVP for Concert!") at #rsvp so it
--      opens the same layer,
--   3. republish (snapshot draft -> published_blocks).
--
-- Step 3 publishes whatever is currently in the draft. As of 2026-08-04 the
-- draft and the published snapshot are identical, so this only adds the new
-- block. If you have edited the site since, preview at /admin/public-page
-- first and press Publish there instead of running step 3.
--
-- Idempotent: re-running will not add a second block.

DO $$
DECLARE
  v_tenant UUID := '364cc4db-68d6-4b7e-bed1-94166a1f2deb';  -- kevin
BEGIN
  -- 1. The RSVP block. Draft positions are 0,1,5,6,7 — slot 2 is free, so
  --    it lands right under the hero without renumbering anything.
  IF NOT EXISTS (
    SELECT 1 FROM gw_site_blocks WHERE tenant_id = v_tenant AND block_type = 'concert-rsvp'
  ) THEN
    INSERT INTO gw_site_blocks (tenant_id, block_type, position, is_visible, config)
    VALUES (
      v_tenant, 'concert-rsvp', 2, true,
      jsonb_build_object(
        'eventSlug',    'retirement-concert',
        'heading',      'RSVP',
        'blurb',        'It would mean the world to have you there. Reserve your seats below — '
                     || 'and pick up a souvenir while you''re at it.',
        'buttonLabel',  'RSVP and reserve seats',
        'showCard',     true,
        'merchHeading', 'Souvenirs',
        'merchBlurb',   'Take something home from the evening. Picked up at the concert.'
      )
    );
    RAISE NOTICE 'added concert-rsvp block';
  ELSE
    RAISE NOTICE 'concert-rsvp block already present';
  END IF;

  -- 2. Hero CTA -> the same layer. Only touches an existing first button.
  UPDATE gw_site_blocks
     SET config = jsonb_set(config, '{buttons,0,url}', '"#rsvp"'::jsonb),
         updated_at = now()
   WHERE tenant_id = v_tenant
     AND block_type = 'hero'
     AND jsonb_typeof(config->'buttons') = 'array'
     AND config->'buttons'->0 IS NOT NULL;

  -- 3. Republish: snapshot the draft into published_blocks.
  UPDATE gw_public_sites s
     SET published_blocks = COALESCE((
           SELECT jsonb_agg(
                    jsonb_build_object(
                      'id',         b.id,
                      'block_type', b.block_type,
                      'position',   b.position,
                      'config',     b.config,
                      'is_visible', b.is_visible
                    ) ORDER BY b.position
                  )
             FROM gw_site_blocks b
            WHERE b.tenant_id = v_tenant
         ), '[]'::jsonb),
         published_at = now(),
         is_published = true
   WHERE s.tenant_id = v_tenant;
END $$;

-- Confirm what is now live.
SELECT jsonb_array_length(published_blocks) AS published_block_count,
       published_at
  FROM gw_public_sites
 WHERE tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb';
