-- Task 6: record_fee_payment / refund_fee / waive_fee RPCs

-- ── record_fee_payment ────────────────────────────────────────────────────────
-- Increments paid_amount by p_amount.
-- If paid_amount >= amount → status='paid', else status='partial'.
-- Guards against overpayment and payments on refunded/waived fees.

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

-- ── refund_fee ────────────────────────────────────────────────────────────────
-- Flips status to 'refunded' and appends note.
-- Stripe refund call is handled client-side (Task 8).

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

-- ── waive_fee ─────────────────────────────────────────────────────────────────
-- Flips status to 'waived' and appends note.

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

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION record_fee_payment(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_fee(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION waive_fee(uuid, text) TO authenticated;
