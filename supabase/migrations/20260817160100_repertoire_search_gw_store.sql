-- repertoire_search v2: add a GW Sheet Music Store arm (gw_partner_scores)
-- alongside pd_works and ext_catalog_items, so the unified search surfaces
-- purchasable partner scores. Same signature and row shape as
-- 20260727120100 — CREATE OR REPLACE keeps existing grants.
-- Store rows: source='gw-store', product_url is the in-app score page,
-- published scores of ACTIVE partners only (function is SECURITY DEFINER,
-- so the suspend filter must live here, not in RLS).

CREATE OR REPLACE FUNCTION repertoire_search(
  p_query      text DEFAULT NULL,
  p_ensemble   text DEFAULT NULL,
  p_voicing    text DEFAULT NULL,
  p_language   text DEFAULT NULL,
  p_composer   text DEFAULT NULL,
  p_source     text DEFAULT NULL,
  p_limit      int  DEFAULT 50,
  p_offset     int  DEFAULT 0
)
RETURNS TABLE (
  id                 uuid,
  source             text,
  source_id          text,
  title              text,
  composer           text,
  voicing            text,
  language           text,
  ensemble_type      text,
  publisher          text,
  editors_choice     boolean,
  list_price_cents   int,
  currency           text,
  source_page_url    text,
  product_url        text,
  affiliate_url      text,
  thumbnail_url      text,
  audio_preview_url  text,
  attribution        text,
  has_cached_pdf     boolean,
  rank               real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH q AS (
    SELECT
      CASE
        WHEN p_query IS NULL OR length(trim(p_query)) = 0 THEN NULL
        ELSE plainto_tsquery('simple', public.gw_unaccent(p_query))
      END AS ts
  ),
  pd AS (
    SELECT
      w.id,
      w.source,
      w.source_id,
      w.title,
      w.composer,
      w.voicing,
      w.language,
      'choral'::text        AS ensemble_type,    -- CPDL is choral by definition
      NULL::text            AS publisher,
      false                 AS editors_choice,
      NULL::int             AS list_price_cents,
      NULL::text            AS currency,
      w.source_page_url,
      NULL::text            AS product_url,
      NULL::text            AS affiliate_url,
      NULL::text            AS thumbnail_url,
      NULL::text            AS audio_preview_url,
      w.attribution,
      (w.storage_key IS NOT NULL) AS has_cached_pdf,
      CASE
        WHEN (SELECT ts FROM q) IS NOT NULL
          THEN ts_rank(w.search_vec, (SELECT ts FROM q))
        ELSE 0
      END AS rank
    FROM pd_works w
    WHERE
      (
        (SELECT ts FROM q) IS NULL
        OR w.search_vec @@ (SELECT ts FROM q)
        OR (p_query IS NOT NULL AND w.title ILIKE '%' || p_query || '%')
      )
      AND (p_voicing  IS NULL OR w.voicing  ILIKE p_voicing  || '%')
      AND (p_language IS NULL OR w.language ILIKE p_language || '%')
      AND (p_composer IS NULL OR w.composer ILIKE '%' || p_composer || '%')
      AND (p_source   IS NULL OR w.source   = p_source)
      AND (p_ensemble IS NULL OR p_ensemble = 'choral')
  ),
  ext AS (
    SELECT
      e.id,
      e.source,
      e.source_id,
      e.title,
      e.composer,
      e.voicing,
      e.language,
      e.ensemble_type,
      e.publisher,
      e.editors_choice,
      e.list_price_cents,
      e.currency,
      e.source_page_url,
      e.product_url,
      e.affiliate_url,
      e.thumbnail_url,
      e.audio_preview_url,
      NULL::text          AS attribution,
      false               AS has_cached_pdf,
      CASE
        WHEN (SELECT ts FROM q) IS NOT NULL
          THEN ts_rank(e.search_vec, (SELECT ts FROM q))
             + CASE WHEN e.editors_choice THEN 0.05 ELSE 0 END
        ELSE CASE WHEN e.editors_choice THEN 0.05 ELSE 0 END
      END AS rank
    FROM ext_catalog_items e
    WHERE
      (
        (SELECT ts FROM q) IS NULL
        OR e.search_vec @@ (SELECT ts FROM q)
        OR (p_query IS NOT NULL AND e.title ILIKE '%' || p_query || '%')
      )
      AND (p_voicing  IS NULL OR e.voicing  ILIKE p_voicing  || '%')
      AND (p_language IS NULL OR e.language ILIKE p_language || '%')
      AND (p_composer IS NULL OR e.composer ILIKE '%' || p_composer || '%')
      AND (p_source   IS NULL OR e.source   = p_source)
      AND (p_ensemble IS NULL OR e.ensemble_type = p_ensemble)
  ),
  store AS (
    SELECT
      s.id,
      'gw-store'::text      AS source,
      s.id::text            AS source_id,
      s.title,
      s.composer,
      s.voicing,
      s.language,
      s.ensemble_type,
      pr.display_name       AS publisher,
      false                 AS editors_choice,
      s.price_cents         AS list_price_cents,
      s.currency,
      NULL::text            AS source_page_url,
      '/store/scores/' || s.id::text AS product_url,
      NULL::text            AS affiliate_url,
      NULL::text            AS thumbnail_url,
      NULL::text            AS audio_preview_url,
      NULL::text            AS attribution,
      false                 AS has_cached_pdf,
      CASE
        WHEN (SELECT ts FROM q) IS NOT NULL
          THEN ts_rank(s.search_vec, (SELECT ts FROM q))
        ELSE 0
      END AS rank
    FROM gw_partner_scores s
    JOIN gw_partners pr ON pr.id = s.partner_id AND pr.status = 'active'
    WHERE
      s.status = 'published'
      AND (
        (SELECT ts FROM q) IS NULL
        OR s.search_vec @@ (SELECT ts FROM q)
        OR (p_query IS NOT NULL AND s.title ILIKE '%' || p_query || '%')
      )
      AND (p_voicing  IS NULL OR s.voicing  ILIKE p_voicing  || '%')
      AND (p_language IS NULL OR s.language ILIKE p_language || '%')
      AND (p_composer IS NULL OR s.composer ILIKE '%' || p_composer || '%')
      AND (p_source   IS NULL OR 'gw-store' = p_source)
      AND (p_ensemble IS NULL OR s.ensemble_type = p_ensemble)
  )
  SELECT * FROM pd
  UNION ALL
  SELECT * FROM ext
  UNION ALL
  SELECT * FROM store
  ORDER BY rank DESC, title ASC
  LIMIT GREATEST(1, LEAST(p_limit, 200))
  OFFSET GREATEST(0, p_offset);
$$;
