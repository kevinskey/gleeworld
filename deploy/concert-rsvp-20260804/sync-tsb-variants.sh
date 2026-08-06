#!/usr/bin/env bash
# Backfill garment sizes + colors from T-Shirt Brothers into GleeWorld.
#
# Run ON the droplet (both databases are local to it, but they are different
# servers: TSB is host Postgres, GleeWorld is Postgres inside the supabase-db
# container, so this bridges them by piping generated SQL).
#
#   scp deploy/concert-rsvp-20260804/sync-tsb-variants.sh root@198.211.113.144:/tmp/
#   ssh root@198.211.113.144 'bash /tmp/sync-tsb-variants.sh'
#
# Two things happen:
#   1. gw_merch_products.variants  <- {sizes, colors} for every TSB product we
#      already mirror (all 5,655 rows currently say {"sizes":[],"colors":[]}),
#      plus base_cost and cover_image while we're there.
#   2. gw_event_merch_items        <- the souvenirs for the Retirement Concert
#      take their sizes/colors from the specific blank they're printed on.
#
# Idempotent: it is a straight overwrite from TSB, so re-run it whenever TSB's
# own S&S sync fills in more of the catalog.
set -euo pipefail

TSB_PSQL=(sudo -u postgres psql -d tshirtbrothers -At)
GW_PSQL=(docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1)

# Which TSB blank each souvenir is printed on. Chosen for having real size AND
# color coverage — most of the TSB catalog still has neither.
TEE_TB_ID=1088     # BELLA + CANVAS 3001RCY — Unisex FWD Jersey Recycled Organic Tee
HOODIE_TB_ID=1112  # BELLA + CANVAS 3329    — Unisex FWD Sueded Fleece Hoodie

echo "== reading TSB catalog"
# Emit one INSERT ... ON CONFLICT-free UPDATE per product as a single VALUES
# list. jsonb is passed through verbatim; quoting is handled by quote_literal
# so a product name with an apostrophe cannot break the statement.
"${TSB_PSQL[@]}" -c "
  SELECT string_agg(
    format('(%s,%s,%s,%s,%s)',
      quote_literal(id::text),
      quote_literal(COALESCE(sizes,  '[]'::jsonb)::text),
      quote_literal(COALESCE(colors, '[]'::jsonb)::text),
      COALESCE(retail_price, 0),
      quote_literal(COALESCE(image_url, ''))
    ), E',\n')
  FROM products
  WHERE jsonb_array_length(COALESCE(sizes,'[]'::jsonb)) > 0
     OR jsonb_array_length(COALESCE(colors,'[]'::jsonb)) > 0;
" > /tmp/tsb_variants_values.sql

if [ ! -s /tmp/tsb_variants_values.sql ]; then
  echo "!! TSB returned no products with sizes or colors — aborting"; exit 1
fi
echo "   $(grep -c '^(' /tmp/tsb_variants_values.sql || true) product rows with variants"

echo "== writing into GleeWorld"
{
  echo "BEGIN;"
  echo "CREATE TEMP TABLE tsb_in (tb_id text, sizes jsonb, colors jsonb, retail numeric, image text) ON COMMIT DROP;"
  echo "INSERT INTO tsb_in (tb_id, sizes, colors, retail, image) VALUES"
  cat /tmp/tsb_variants_values.sql
  echo ";"

  # 1. the mirrored catalog
  cat <<'SQL'
UPDATE gw_merch_products m
   SET variants   = jsonb_build_object('sizes', i.sizes, 'colors', i.colors),
       base_cost  = i.retail,
       cover_image = NULLIF(i.image, ''),
       synced_at  = now()
  FROM tsb_in i
 WHERE m.tb_product_id = i.tb_id;
SQL

  # 2. the two souvenirs on the concert
  cat <<SQL
UPDATE gw_event_merch_items e
   SET tb_product_id = i.tb_id,
       sizes         = i.sizes,
       colors        = i.colors,
       updated_at    = now()
  FROM tsb_in i
 WHERE e.name = 'Souvenir T-Shirt' AND i.tb_id = '${TEE_TB_ID}';

UPDATE gw_event_merch_items e
   SET tb_product_id = i.tb_id,
       sizes         = i.sizes,
       colors        = i.colors,
       updated_at    = now()
  FROM tsb_in i
 WHERE e.name = 'Souvenir Hoodie' AND i.tb_id = '${HOODIE_TB_ID}';
SQL

  echo "COMMIT;"
} | "${GW_PSQL[@]}"

echo "== result"
"${GW_PSQL[@]}" -c "
  SELECT name,
         jsonb_array_length(sizes)  AS sizes,
         jsonb_array_length(colors) AS colors,
         tb_product_id
    FROM gw_event_merch_items
   ORDER BY sort_order;"
"${GW_PSQL[@]}" -c "
  SELECT count(*) FILTER (WHERE jsonb_array_length(variants->'sizes')  > 0) AS catalog_with_sizes,
         count(*) FILTER (WHERE jsonb_array_length(variants->'colors') > 0) AS catalog_with_colors
    FROM gw_merch_products;"
