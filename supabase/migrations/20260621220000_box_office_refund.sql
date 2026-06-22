-- Box Office — refund support.
--
-- gw_box_office_void_order is the single atomic write path called both
-- by our admin refund Edge Function AND by the Connect webhook when a
-- refund originates from the tenant's Stripe Dashboard. Either entry
-- point keeps our DB in lockstep with Stripe.
--
-- Behavior:
--   - Idempotent: a second call for an already-refunded order is a no-op.
--   - Voids ALL tickets on the order (including ones already redeemed)
--     so the door scanner rejects re-entry attempts on partial refunds.
--   - Decrements tier.quantity_sold by order.quantity, clamped at zero
--     so a double-call can't underflow even if the idempotency guard
--     above somehow missed.
--
-- Comps (status='comp') can also be voided through this function — they
-- don't have a Stripe refund attached but freeing the seats is the same
-- DB shape. Callers distinguish refunds vs comp voids; the SQL doesn't
-- need to.

CREATE OR REPLACE FUNCTION public.gw_box_office_void_order(
  p_order_id   UUID,
  p_tenant_id  UUID,
  p_next_status TEXT      -- 'refunded' (paid → refunded) or 'void' (comp → void)
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
BEGIN
  IF p_next_status NOT IN ('refunded', 'void') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  SELECT * INTO v_order
    FROM gw_ticket_orders
   WHERE id = p_order_id AND tenant_id = p_tenant_id
   FOR UPDATE;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('error', 'order_not_found');
  END IF;

  -- Terminal states are a no-op so the webhook can fire idempotently.
  IF v_order.status = p_next_status THEN
    RETURN jsonb_build_object('already_done', true, 'order_id', v_order.id);
  END IF;
  IF v_order.status NOT IN ('paid', 'comp') THEN
    RETURN jsonb_build_object('error', 'cannot_void', 'current_status', v_order.status);
  END IF;

  -- Void every ticket on the order. status='void' is the terminal state
  -- the door scanner uses to reject re-entry attempts.
  UPDATE gw_tickets
     SET status = 'void'
   WHERE order_id = v_order.id;

  -- Decrement the tier's sold count by the order's quantity, clamped at 0
  -- to survive any improbable double-call from concurrent webhook + UI.
  UPDATE gw_ticket_tiers
     SET quantity_sold = GREATEST(0, quantity_sold - v_order.quantity)
   WHERE id = v_order.tier_id;

  UPDATE gw_ticket_orders
     SET status = p_next_status,
         updated_at = now()
   WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'tickets_voided', v_order.quantity,
    'previous_status', v_order.status,
    'next_status', p_next_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.gw_box_office_void_order(UUID, UUID, TEXT)
  TO postgres, service_role, supabase_admin;
