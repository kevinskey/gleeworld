-- Local-dev bootstrap for tables/columns that production created by hand and
-- that no migration in server/migrations/ creates. Derived from how the code
-- in server/routes/{invoices,quotes,payments,admin,products,designs,gangsheet,
-- gangsheetStore,deepseek}.js and client/src/lib/api.ts reads/writes them.
-- Idempotent: every statement is IF NOT EXISTS.

BEGIN;

-- ---------------------------------------------------------------------------
-- quotes: columns referenced by code / later migrations
-- (users.id is INTEGER here; add_quote_email_columns.sql declares UUID, which
--  is why that migration failed. Pre-creating the column as INTEGER makes the
--  migration's ADD COLUMN IF NOT EXISTS a no-op.)
-- ---------------------------------------------------------------------------
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS user_id              INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS product_name         VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_at          TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS price_breakdown      JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS admin_message        TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_amount       NUMERIC(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS archived_at          TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS archive_reason       TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS admin_notes          TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS extra_mockups        JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cc_emails            JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS follow_up_2_sent_at  TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS follow_up_3_sent_at  TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS closing_note_sent_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS request_ack_sent_at  TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivered_notified_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id) WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- products: columns the catalog_products view (supplier_catalog_v1.sql) selects
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS case_qty       INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS full_case_only BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- invoices (routes/invoices.js, routes/payments.js, routes/orderDetail.js,
-- services/mailToInvoice.js, client Invoice type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id               SERIAL PRIMARY KEY,
  invoice_number   VARCHAR(50) NOT NULL UNIQUE,
  customer_name    VARCHAR(255) NOT NULL DEFAULT '',
  customer_email   VARCHAR(255) NOT NULL DEFAULT '',
  customer_phone   VARCHAR(50),
  customer_address JSONB,
  items            JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid      NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_due       NUMERIC(10,2) NOT NULL DEFAULT 0,
  payments         JSONB DEFAULT '[]'::jsonb,
  notes            TEXT,
  due_date         DATE,
  quote_id         INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'draft',
  deposit_percent  INTEGER NOT NULL DEFAULT 0,
  mockup_id        INTEGER REFERENCES mockups(id) ON DELETE SET NULL,
  extra_mockups    JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_emails        JSONB NOT NULL DEFAULT '[]'::jsonb,
  public_token     VARCHAR(64) DEFAULT md5(random()::text || clock_timestamp()::text)
                                    || md5(random()::text || clock_timestamp()::text),
  sent_at          TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  archived_at      TIMESTAMPTZ,
  archive_reason   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON invoices(LOWER(customer_email));

-- Back-link for orders opened from standalone invoices
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS source_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- quote_items (routes/quotes.js QUOTE_ITEMS_SUBQUERY, orderDetail.js)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_items (
  id             SERIAL PRIMARY KEY,
  quote_id       INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL DEFAULT 0,
  product_id     INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name   VARCHAR(255),
  color          VARCHAR(100),
  sizes          JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity       INTEGER NOT NULL DEFAULT 0,
  print_areas    JSONB NOT NULL DEFAULT '[]'::jsonb,
  design_url     TEXT,
  unit_price     NUMERIC(10,2),
  line_total     NUMERIC(10,2),
  notes          TEXT,
  item_type      VARCHAR(32) NOT NULL DEFAULT 'product',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_position ON quote_items(quote_id, position);

-- ---------------------------------------------------------------------------
-- promotions (routes/deepseek.js, packing_slip_coupon_*.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(64) NOT NULL UNIQUE,
  holiday        VARCHAR(100),
  headline       TEXT,
  subtext        TEXT,
  discount_type  VARCHAR(20) NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses       INTEGER,
  times_used     INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  ai_generated   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- saved_designs (routes/designs.js, routes/admin.js, routes/auth.js)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_designs (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL DEFAULT 'Untitled Design',
  product_ss_id      VARCHAR(100),
  product_name       VARCHAR(500),
  product_image      TEXT,
  color_index        INTEGER NOT NULL DEFAULT 0,
  elements           JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail          TEXT,
  mockup_url         TEXT,
  print_url          TEXT,
  schema_version     INTEGER NOT NULL DEFAULT 1,
  elements_legacy    JSONB,
  legacy_archived_at TIMESTAMPTZ,
  canvas_inches      NUMERIC(5,2) NOT NULL DEFAULT 12,
  canvas_inches_h    NUMERIC(5,2) NOT NULL DEFAULT 12,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_designs_user_id ON saved_designs(user_id);

-- ---------------------------------------------------------------------------
-- gang_sheets (routes/gangsheet.js, routes/gangsheetStore.js)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gang_sheets (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL DEFAULT 'Untitled Sheet',
  sheet_length_ft NUMERIC(6,2),
  width_in        INTEGER NOT NULL DEFAULT 22,
  pricing_tier    VARCHAR(50),
  total_cost      NUMERIC(10,2),
  layout_json     JSONB,
  designs         JSONB NOT NULL DEFAULT '[]'::jsonb,
  status          VARCHAR(50) NOT NULL DEFAULT 'draft',
  preview_url     TEXT,
  exported_url    TEXT,
  vendor_name     TEXT,
  vendor_email    TEXT,
  vendor_sent_at  TIMESTAMPTZ,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gang_sheets_created_by ON gang_sheets(created_by);

-- ---------------------------------------------------------------------------
-- mockups: legacy back-preview column prod added by hand; invoices.js joins
-- COALESCE(m.preview_image_url_back, m.back_preview_image_url).
-- ---------------------------------------------------------------------------
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS back_preview_image_url TEXT;
-- Columns routes/mockups.js LIST_COLUMNS / duplicate select that only prod has.
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS back_graphic_url       TEXT;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS back_placement         JSONB;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS back_product_image_url TEXT;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS elements               JSONB;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS color_index            INTEGER;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS sent_at                TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- custom_products (routes/admin.js /admin/custom-products CRUD)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(100) NOT NULL DEFAULT 'Custom',
  image_url   TEXT,
  price       NUMERIC(10,2),
  price_unit  VARCHAR(50) NOT NULL DEFAULT 'per item',
  sizes       JSONB NOT NULL DEFAULT '[]'::jsonb,
  options     JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_products TO tsbadmin;
GRANT USAGE, SELECT ON SEQUENCE custom_products_id_seq TO tsbadmin;

-- ---------------------------------------------------------------------------
-- Grants: prod's API role is tsbadmin (several migrations GRANT to it).
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices, quote_items, promotions, saved_designs, gang_sheets TO tsbadmin;
GRANT USAGE, SELECT ON SEQUENCE invoices_id_seq, quote_items_id_seq, promotions_id_seq, saved_designs_id_seq, gang_sheets_id_seq TO tsbadmin;

COMMIT;
