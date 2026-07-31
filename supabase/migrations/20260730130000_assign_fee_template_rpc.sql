-- Migration: assign_fee_template RPC
-- Bulk-assigns a fee template to N users, idempotent (skips users who already
-- have an unpaid row for that template). Returns count of rows created.

CREATE OR REPLACE FUNCTION assign_fee_template(p_template_id uuid, p_user_ids uuid[])
  RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_template gw_fee_templates%ROWTYPE;
  v_created int := 0;
BEGIN
  SELECT * INTO v_template FROM gw_fee_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;

  -- Insert one row per user, skipping users who already have an unpaid row for this template
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

REVOKE ALL ON FUNCTION assign_fee_template(uuid, uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION assign_fee_template(uuid, uuid[]) TO authenticated;
