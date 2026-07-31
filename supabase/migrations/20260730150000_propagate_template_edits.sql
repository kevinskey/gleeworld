-- update_fee_template(p_template_id, p_patch)
--
-- Updates a fee template with the fields provided in p_patch, then
-- propagates the changes to all gw_student_fees rows that reference
-- this template AND have status = 'pending'.  Rows in any other status
-- (paid, refunded, waived) are left untouched — they are "frozen."
--
-- Returns the updated gw_fee_templates row.

CREATE OR REPLACE FUNCTION update_fee_template(p_template_id uuid, p_patch jsonb)
  RETURNS gw_fee_templates LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tpl gw_fee_templates%ROWTYPE;
BEGIN
  UPDATE gw_fee_templates
    SET name                  = COALESCE(p_patch->>'name',                    name),
        description           = COALESCE(p_patch->>'description',             description),
        total_amount          = COALESCE((p_patch->>'total_amount')::numeric,  total_amount),
        due_date              = COALESCE((p_patch->>'due_date')::date,         due_date),
        allow_self_serve_split = COALESCE(
                                    (p_patch->>'allow_self_serve_split')::boolean,
                                    allow_self_serve_split
                                 ),
        updated_at            = now()
  WHERE id = p_template_id
  RETURNING * INTO v_tpl;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template not found: %', p_template_id;
  END IF;

  -- Propagate mutable fields to pending student fee rows only.
  -- Rows with status IN ('paid', 'refunded', 'waived') are frozen and
  -- intentionally skipped.
  UPDATE gw_student_fees
    SET name       = v_tpl.name,
        amount     = v_tpl.total_amount,
        due_date   = v_tpl.due_date,
        updated_at = now()
  WHERE template_id = v_tpl.id
    AND status      = 'pending';

  RETURN v_tpl;
END $$;

GRANT EXECUTE ON FUNCTION update_fee_template(uuid, jsonb) TO authenticated;
