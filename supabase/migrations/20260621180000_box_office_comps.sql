-- Box Office Phase G — comp ticket issuance.
--
-- Tenant admins routinely issue free tickets for performers' families,
-- press, board members, etc. Same QR + door-scan path as paid tickets;
-- the only difference is amount_cents=0, order.status='comp', and
-- ticket.is_comp=true so post-event reports can split comp from paid.
--
-- Comps DO decrement the tier's quantity_sold so the running total
-- remains the source of truth for "how many seats are committed."
-- If a tenant wants to reserve a separate comp pool, they create a
-- dedicated tier (e.g. "Performer Family Comps" with price_cents=0
-- and box-office-status='draft' so it never lists publicly).

CREATE OR REPLACE FUNCTION public.gw_box_office_issue_comps(
  p_tenant_id  UUID,
  p_event_id   UUID,
  p_tier_id    UUID,
  p_holder_email TEXT,
  p_holder_name  TEXT,
  p_quantity   INTEGER,
  p_signing_secret TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- extensions schema holds pgcrypto's gen_random_bytes / hmac; without
-- it the function falls back to public-only and 42883s at runtime.
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_tier   RECORD;
  v_event  RECORD;
  v_order_id UUID;
  v_access_token TEXT;
  v_ticket_id UUID;
  v_token TEXT;
  v_tickets JSONB := '[]'::jsonb;
  i INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 50 THEN
    RETURN jsonb_build_object('error', 'invalid_quantity');
  END IF;

  -- Lock the tier first so two concurrent comp issuances can't oversell.
  SELECT * INTO v_tier
    FROM gw_ticket_tiers
   WHERE id = p_tier_id AND tenant_id = p_tenant_id AND event_id = p_event_id
   FOR UPDATE;
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('error', 'tier_not_found');
  END IF;
  IF v_tier.quantity_sold + p_quantity > v_tier.quantity_total THEN
    RETURN jsonb_build_object(
      'error', 'over_capacity',
      'sold',  v_tier.quantity_sold,
      'total', v_tier.quantity_total,
      'requested', p_quantity
    );
  END IF;

  SELECT id, title INTO v_event
    FROM gw_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id;
  IF v_event IS NULL THEN
    RETURN jsonb_build_object('error', 'event_not_found');
  END IF;

  -- access_token is what the recipient uses to open /tickets/<token>.
  -- Mirror the random scheme from box-office-checkout: 32 bytes hex.
  v_access_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO gw_ticket_orders
    (tenant_id, event_id, tier_id, quantity, buyer_email, buyer_name,
     amount_cents, currency, status, access_token)
  VALUES
    (p_tenant_id, p_event_id, p_tier_id, p_quantity,
     COALESCE(NULLIF(p_holder_email, ''), ''), NULLIF(p_holder_name, ''),
     0, v_tier.currency, 'comp', v_access_token)
  RETURNING id INTO v_order_id;

  UPDATE gw_ticket_tiers
     SET quantity_sold = quantity_sold + p_quantity
   WHERE id = v_tier.id;

  FOR i IN 1 .. p_quantity LOOP
    v_ticket_id := gen_random_uuid();
    v_token := v_ticket_id::text || '.' ||
               encode(hmac(v_ticket_id::text, p_signing_secret, 'sha256'), 'hex');
    INSERT INTO gw_tickets
      (id, tenant_id, order_id, tier_id, event_id, token, status, is_comp, holder_name)
    VALUES
      (v_ticket_id, p_tenant_id, v_order_id, p_tier_id, p_event_id,
       v_token, 'valid', true, NULLIF(p_holder_name, ''));
    v_tickets := v_tickets || jsonb_build_object(
      'id', v_ticket_id,
      'token', v_token,
      'tier_name', v_tier.name
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'access_token', v_access_token,
    'event_title', v_event.title,
    'tier_name', v_tier.name,
    'quantity', p_quantity,
    'tickets', v_tickets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.gw_box_office_issue_comps(UUID, UUID, UUID, TEXT, TEXT, INTEGER, TEXT)
  TO postgres, service_role, supabase_admin;
