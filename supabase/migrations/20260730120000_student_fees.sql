-- 20260730120000_student_fees.sql
-- Rename existing dues tables into a generalized fees schema,
-- then add template + settings tables with full tenant isolation.
BEGIN;

-- 1. Rename existing dues tables to their new generalized names
--
-- NOTE: The installments table in this repo is named gw_dues_installments,
-- NOT gw_payment_plan_installments as specified in the task brief.
-- The brief's interface list used the wrong source name; we rename the table
-- that actually exists.
ALTER TABLE gw_dues_records          RENAME TO gw_student_fees;
ALTER TABLE gw_dues_payment_plans    RENAME TO gw_fee_payment_plans;
ALTER TABLE gw_dues_installments     RENAME TO gw_fee_plan_installments;
ALTER TABLE gw_dues_reminders        RENAME TO gw_fee_reminders;

-- 2. Rename FK columns that reference the old table name
ALTER TABLE gw_fee_payment_plans RENAME COLUMN dues_record_id TO student_fee_id;
ALTER TABLE gw_fee_reminders     RENAME COLUMN dues_record_id TO student_fee_id;

-- 3. Add new columns to gw_student_fees
--
-- NOTE: created_by and paid_amount already exist in gw_dues_records (added in
-- migration 20250805043643); we do NOT re-add them here.
-- NOTE: gw_dues_records has no academic_year column; omitting it from the
-- backfill UPDATE below.
ALTER TABLE gw_student_fees
  ADD COLUMN template_id uuid,
  ADD COLUMN category text NOT NULL DEFAULT 'dues'
    CHECK (category IN ('dues','wardrobe','trip','travel','other')),
  ADD COLUMN name text NOT NULL DEFAULT 'Dues',
  ADD COLUMN payment_reference text,
  ADD COLUMN stripe_payment_intent_id text,
  ADD COLUMN context_type text CHECK (context_type IN ('trip','wardrobe_item','semester') OR context_type IS NULL),
  ADD COLUMN context_id uuid,
  ADD COLUMN paid_at timestamptz;

-- Backfill 'name' from semester only (academic_year column does not exist)
UPDATE gw_student_fees
SET name = COALESCE(NULLIF(TRIM(semester), ''), 'Dues')
WHERE category = 'dues';

-- Extend the status check to include all new statuses.
-- Prior migration 20250904040803 may have renamed the original constraint.
-- We introspect pg_constraint to drop ANY existing CHECK on the status column
-- regardless of its name, then add the canonical new constraint.
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'gw_student_fees'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE gw_student_fees DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;
ALTER TABLE gw_student_fees ADD CONSTRAINT gw_student_fees_status_check
  CHECK (status IN ('pending','partial','paid','overdue','refunded','waived'));

-- payment_method: drop any existing CHECK constraint on this column by name,
-- then add the new one.  (No named check existed in the original schema, but
-- a rename in a prior migration could have introduced one.)
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'gw_student_fees'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%payment_method%'
  LOOP
    EXECUTE format('ALTER TABLE gw_student_fees DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;
ALTER TABLE gw_student_fees ADD CONSTRAINT gw_student_fees_payment_method_check
  CHECK (payment_method IN ('stripe','cash','check','venmo','other') OR payment_method IS NULL);

-- 4. Add 'source' to gw_fee_payment_plans
ALTER TABLE gw_fee_payment_plans
  ADD COLUMN source text NOT NULL DEFAULT 'self_serve'
    CHECK (source IN ('self_serve','admin_defined'));

-- 5. Create gw_fee_templates
CREATE TABLE gw_fee_templates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id) ON DELETE CASCADE,
  category               text NOT NULL CHECK (category IN ('dues','wardrobe','trip','travel','other')),
  name                   text NOT NULL,
  description            text,
  total_amount           numeric(10,2) NOT NULL,
  currency               text NOT NULL DEFAULT 'USD',
  due_date               date,
  allow_self_serve_split boolean NOT NULL DEFAULT true,
  context_type           text CHECK (context_type IN ('trip','wardrobe_item','semester') OR context_type IS NULL),
  context_id             uuid,
  created_by             uuid NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  archived_at            timestamptz
);

-- 6. Create gw_fee_template_installments
CREATE TABLE gw_fee_template_installments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES gw_fee_templates(id) ON DELETE CASCADE,
  sequence    int NOT NULL,
  amount      numeric(10,2) NOT NULL,
  due_date    date NOT NULL,
  UNIQUE (template_id, sequence)
);

-- 7. Create gw_tenant_fee_settings
CREATE TABLE gw_tenant_fee_settings (
  tenant_id               uuid PRIMARY KEY REFERENCES gw_tenants(id) ON DELETE CASCADE,
  accepted_manual_methods text[] NOT NULL DEFAULT ARRAY['cash','check'],
  treasurer_contact_name  text,
  treasurer_contact_email text,
  treasurer_contact_phone text,
  statement_descriptor    text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 8. Add FK for template_id on gw_student_fees (after template table exists)
ALTER TABLE gw_student_fees
  ADD CONSTRAINT gw_student_fees_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gw_fee_templates(id) ON DELETE SET NULL;

-- 9. BEFORE INSERT tenant_id triggers for the three new tables.
--    The renamed dues tables keep their existing triggers automatically.
--    We use the platform-standard set_tenant_id_default() function.

DROP TRIGGER IF EXISTS trg_gw_fee_templates_tenant_default ON gw_fee_templates;
CREATE TRIGGER trg_gw_fee_templates_tenant_default
  BEFORE INSERT ON gw_fee_templates
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_default();

DROP TRIGGER IF EXISTS trg_gw_fee_template_installments_tenant_default ON gw_fee_template_installments;
CREATE TRIGGER trg_gw_fee_template_installments_tenant_default
  BEFORE INSERT ON gw_fee_template_installments
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_default();

-- gw_tenant_fee_settings.tenant_id is the PK and must be supplied explicitly;
-- no auto-fill trigger.

-- 10. RESTRICTIVE RLS on the three new tables (matches platform standard)
ALTER TABLE gw_fee_templates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_fee_template_installments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tenant_fee_settings        ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_templates ON gw_fee_templates
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_template_installments ON gw_fee_template_installments
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_fee_settings ON gw_tenant_fee_settings
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Permissive read policy: authenticated members of the tenant can read templates
CREATE POLICY read_templates ON gw_fee_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY read_template_installments ON gw_fee_template_installments
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY read_fee_settings ON gw_tenant_fee_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write policies: admin / super_admin roles only.
--
-- NOTE: The brief specified has_role(auth.uid(), 'treasurer') but 'treasurer'
-- is NOT a value of the app_role enum (it is only a text position in
-- gw_executive_board_members).  Calling has_role with a non-enum value would
-- cause a type-cast error at runtime.  We use admin + super_admin only here;
-- a follow-on migration can add a 'treasurer' app_role value if desired.
CREATE POLICY admin_write_templates ON gw_fee_templates
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
CREATE POLICY admin_update_templates ON gw_fee_templates
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
CREATE POLICY admin_delete_templates ON gw_fee_templates
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 11. Indexes for common queries
CREATE INDEX idx_student_fees_user_status ON gw_student_fees(user_id, status);
CREATE INDEX idx_student_fees_template ON gw_student_fees(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_student_fees_context ON gw_student_fees(context_type, context_id) WHERE context_type IS NOT NULL;
CREATE INDEX idx_fee_templates_category ON gw_fee_templates(category, tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_fee_templates_context ON gw_fee_templates(context_type, context_id) WHERE context_type IS NOT NULL;

-- 12. updated_at auto-touch triggers (reuse platform-standard function)
DROP TRIGGER IF EXISTS trg_gw_fee_templates_updated_at ON gw_fee_templates;
CREATE TRIGGER trg_gw_fee_templates_updated_at
  BEFORE UPDATE ON gw_fee_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_gw_tenant_fee_settings_updated_at ON gw_tenant_fee_settings;
CREATE TRIGGER trg_gw_tenant_fee_settings_updated_at
  BEFORE UPDATE ON gw_tenant_fee_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
