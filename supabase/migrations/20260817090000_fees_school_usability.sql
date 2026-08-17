-- Fees for schools: categories, guest pay token, RPC role gates, settings
-- write policy.
-- Spec: docs/superpowers/specs/2026-08-17-fees-school-usability.md
--
-- Self-hosted droplet has no schema_migrations — apply manually via psql as
-- supabase_admin (see docs/deploy-notes/2026-07-30-student-fees.md pattern).

-- ── 1. Categories: add 'participation' and 'fundraiser' ──────────────────────
ALTER TABLE gw_student_fees  DROP CONSTRAINT IF EXISTS gw_student_fees_category_check;
ALTER TABLE gw_student_fees  ADD CONSTRAINT gw_student_fees_category_check
  CHECK (category IN ('dues','participation','fundraiser','wardrobe','trip','travel','other'));

ALTER TABLE gw_fee_templates DROP CONSTRAINT IF EXISTS gw_fee_templates_category_check;
ALTER TABLE gw_fee_templates ADD CONSTRAINT gw_fee_templates_category_check
  CHECK (category IN ('dues','participation','fundraiser','wardrobe','trip','travel','other'));

-- ── 2. Guest pay token ───────────────────────────────────────────────────────
-- Capability token for the parent-payable link (/pay/fee/:id?token=…).
-- Volatile default → every existing row gets its own distinct uuid.
ALTER TABLE gw_student_fees
  ADD COLUMN IF NOT EXISTS guest_pay_token uuid NOT NULL DEFAULT gen_random_uuid();

-- ── 3. Role-gate the fee RPCs ────────────────────────────────────────────────
-- These four are SECURITY DEFINER and were granted to `authenticated` with a
-- tenant filter but NO role check — any student could mark their own fee paid
-- or waive it. The gate must keep the service role allowed because
-- verify-fee-payment calls record_fee_payment with the service key.

CREATE OR REPLACE FUNCTION fee_rpc_caller_allowed() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT auth.role() = 'service_role' OR public.current_user_is_tenant_admin();
$$;

REVOKE ALL ON FUNCTION fee_rpc_caller_allowed() FROM public;
GRANT EXECUTE ON FUNCTION fee_rpc_caller_allowed() TO authenticated, service_role;

-- record_fee_payment — body identical to 20260730160000 plus the role gate.
CREATE OR REPLACE FUNCTION record_fee_payment(
  p_fee_id   uuid,
  p_method   text,
  p_amount   numeric,
  p_reference text DEFAULT NULL
) RETURNS gw_student_fees
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_fee        gw_student_fees%ROWTYPE;
  v_remaining  numeric;
  v_new_paid   numeric;
  v_new_status text;
BEGIN
  IF NOT fee_rpc_caller_allowed() THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT * INTO v_fee FROM gw_student_fees
   WHERE id = p_fee_id AND tenant_id = current_tenant_id()
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fee not found';
  END IF;

  IF v_fee.status IN ('refunded', 'waived') THEN
    RAISE EXCEPTION 'cannot record payment on % fee', v_fee.status;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  v_remaining := v_fee.amount - v_fee.paid_amount;
  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'amount exceeds remaining %', v_remaining;
  END IF;

  v_new_paid   := v_fee.paid_amount + p_amount;
  v_new_status := CASE WHEN v_new_paid >= v_fee.amount THEN 'paid' ELSE 'partial' END;

  UPDATE gw_student_fees
     SET paid_amount       = v_new_paid,
         status            = v_new_status,
         payment_method    = p_method,
         payment_reference = COALESCE(p_reference, payment_reference),
         paid_at           = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
         updated_at        = now()
   WHERE id = p_fee_id AND tenant_id = current_tenant_id()
   RETURNING * INTO v_fee;

  RETURN v_fee;
END;
$$;

-- refund_fee — body identical to 20260730160000 plus the role gate.
CREATE OR REPLACE FUNCTION refund_fee(
  p_fee_id uuid,
  p_note   text
) RETURNS gw_student_fees
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_fee gw_student_fees%ROWTYPE;
BEGIN
  IF NOT fee_rpc_caller_allowed() THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT * INTO v_fee FROM gw_student_fees
   WHERE id = p_fee_id AND tenant_id = current_tenant_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fee not found';
  END IF;
  IF v_fee.status = 'refunded' THEN
    RAISE EXCEPTION 'fee already refunded';
  END IF;

  UPDATE gw_student_fees
     SET status     = 'refunded',
         notes      = COALESCE(notes || E'\n', '') || 'Refunded: ' || p_note,
         updated_at = now()
   WHERE id = p_fee_id AND tenant_id = current_tenant_id()
   RETURNING * INTO v_fee;

  RETURN v_fee;
END;
$$;

-- waive_fee — body identical to 20260730160000 plus the role gate.
CREATE OR REPLACE FUNCTION waive_fee(
  p_fee_id uuid,
  p_note   text
) RETURNS gw_student_fees
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_fee gw_student_fees%ROWTYPE;
BEGIN
  IF NOT fee_rpc_caller_allowed() THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT * INTO v_fee FROM gw_student_fees
   WHERE id = p_fee_id AND tenant_id = current_tenant_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fee not found';
  END IF;
  IF v_fee.status = 'waived' THEN
    RAISE EXCEPTION 'fee already waived';
  END IF;

  UPDATE gw_student_fees
     SET status     = 'waived',
         notes      = COALESCE(notes || E'\n', '') || 'Waived: ' || p_note,
         updated_at = now()
   WHERE id = p_fee_id AND tenant_id = current_tenant_id()
   RETURNING * INTO v_fee;

  RETURN v_fee;
END;
$$;

-- assign_fee_template — body identical to 20260730130000 plus the role gate.
CREATE OR REPLACE FUNCTION assign_fee_template(p_template_id uuid, p_user_ids uuid[])
  RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_template gw_fee_templates%ROWTYPE;
  v_created int := 0;
BEGIN
  IF NOT fee_rpc_caller_allowed() THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT * INTO v_template FROM gw_fee_templates
   WHERE id = p_template_id AND tenant_id = current_tenant_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;

  INSERT INTO gw_student_fees
    (tenant_id, user_id, template_id, category, name, amount, due_date, context_type, context_id, created_by, status)
  SELECT
    v_template.tenant_id, u.user_id, v_template.id, v_template.category, v_template.name,
    v_template.total_amount, v_template.due_date, v_template.context_type, v_template.context_id,
    v_template.created_by, 'pending'
  FROM unnest(p_user_ids) AS u(user_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM gw_student_fees f
    WHERE f.template_id = v_template.id AND f.user_id = u.user_id
      AND f.status IN ('pending','partial','overdue')
  );
  GET DIAGNOSTICS v_created = ROW_COUNT;
  RETURN v_created;
END $$;

-- ── 4. Admin write policy for gw_tenant_fee_settings ─────────────────────────
-- The table only had RESTRICTIVE tenant isolation + a read policy, so the new
-- settings card had no way to save. current_user_is_tenant_admin() (from
-- 20260809060000) accepts both super_admin spellings and the member-table
-- admin roles.
DROP POLICY IF EXISTS admin_write_fee_settings ON gw_tenant_fee_settings;
CREATE POLICY admin_write_fee_settings ON gw_tenant_fee_settings
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND public.current_user_is_tenant_admin())
  WITH CHECK (tenant_id = current_tenant_id() AND public.current_user_is_tenant_admin());

-- ── 5. Self-serve installment split (student-callable) ───────────────────────
-- Students may split their OWN payable fee into 2–4 monthly installments when
-- the owning template allows it (template-less one-off fees allow it too).
-- SECURITY DEFINER because students have no INSERT policy on the plan tables;
-- ownership + tenant checks below are the guard.
CREATE OR REPLACE FUNCTION split_fee_into_installments(p_fee_id uuid, p_count int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fee gw_student_fees%ROWTYPE;
  v_allow boolean;
  v_remaining numeric;
  v_per numeric;
  v_plan_id uuid;
  i int;
BEGIN
  IF p_count NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'count must be between 2 and 4';
  END IF;

  SELECT * INTO v_fee FROM gw_student_fees
   WHERE id = p_fee_id AND tenant_id = current_tenant_id() AND user_id = auth.uid()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'fee not found'; END IF;
  IF v_fee.status NOT IN ('pending','partial','overdue') THEN
    RAISE EXCEPTION 'fee is not payable';
  END IF;

  IF v_fee.template_id IS NOT NULL THEN
    SELECT allow_self_serve_split INTO v_allow
      FROM gw_fee_templates WHERE id = v_fee.template_id;
    IF v_allow IS FALSE THEN
      RAISE EXCEPTION 'installments are not offered for this fee';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM gw_fee_payment_plans
     WHERE student_fee_id = p_fee_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'an active payment plan already exists';
  END IF;

  v_remaining := v_fee.amount - v_fee.paid_amount;
  IF v_remaining <= 0 THEN RAISE EXCEPTION 'no balance remains'; END IF;
  -- Cent-floor each installment; the last one absorbs the remainder.
  v_per := floor(v_remaining * 100 / p_count) / 100;

  INSERT INTO gw_fee_payment_plans
    (student_fee_id, user_id, tenant_id, total_amount, installments,
     installment_amount, frequency, start_date, end_date, status, source)
  VALUES
    (p_fee_id, v_fee.user_id, v_fee.tenant_id, v_remaining, p_count, v_per,
     'monthly', current_date,
     (current_date + ((p_count - 1) || ' months')::interval)::date,
     'active', 'self_serve')
  RETURNING id INTO v_plan_id;

  FOR i IN 1..p_count LOOP
    INSERT INTO gw_fee_plan_installments
      (payment_plan_id, installment_number, amount, due_date, tenant_id)
    VALUES (
      v_plan_id,
      i,
      CASE WHEN i = p_count THEN v_remaining - v_per * (p_count - 1) ELSE v_per END,
      (current_date + ((i - 1) || ' months')::interval)::date,
      v_fee.tenant_id
    );
  END LOOP;

  RETURN v_plan_id;
END $$;

REVOKE ALL ON FUNCTION split_fee_into_installments(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION split_fee_into_installments(uuid, int) TO authenticated;
