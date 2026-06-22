-- Box Office Phase E — fulfillment via Connect webhook.
--
-- Two pieces:
--
-- 1. Persist the tier + quantity on the order row so the webhook handler
--    can fulfill it without trusting Stripe metadata round-tripped from
--    the browser. (We still set those metadata fields, but the order row
--    is the local source of truth.)
--
-- 2. gw_box_office_fulfill_order — the atomic seat-decrement + ticket
--    mint, called by the port-3030 webhook handler. Wraps everything
--    in a single transaction (the function itself runs in one); locks
--    the tier row to keep concurrent sales from overspilling capacity;
--    and is idempotent: a second call for the same order returns
--    {"already_paid": true} without minting again.
--
-- Token signing uses HMAC-SHA256 from pgcrypto. The ticket holder gets
-- a token of the form "<ticket_id>.<hex_hmac>"; the door scanner can
-- verify the HMAC without a DB hit, then look up the ticket row only
-- if the signature is valid. The signing secret is supplied per call
-- (the webhook reads TICKET_SIGNING_SECRET from the host env).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.gw_ticket_orders
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.gw_ticket_tiers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1);

CREATE OR REPLACE FUNCTION public.gw_box_office_fulfill_order(
  p_order_id UUID,
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_signing_secret TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- extensions schema holds pgcrypto's hmac (used for ticket-token signing).
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_tier  RECORD;
  v_ticket_id UUID;
  v_token TEXT;
  v_tickets JSONB := '[]'::jsonb;
  i INTEGER;
BEGIN
  -- Lock the order so two concurrent webhook deliveries can't both
  -- think the order is still pending.
  SELECT * INTO v_order
    FROM gw_ticket_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('error', 'order_not_found');
  END IF;

  -- Idempotent — if this order already moved off 'pending', do nothing.
  -- Stripe routinely retries webhooks; we treat the second call as a
  -- successful no-op rather than a duplicate mint.
  IF v_order.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'already_paid', true,
      'order_id',     v_order.id,
      'access_token', v_order.access_token
    );
  END IF;

  -- Lock the tier and re-check availability. The CHECK constraint on
  -- gw_ticket_tiers (quantity_sold <= quantity_total) is the final
  -- safety net, but this explicit guard returns a clearer reason.
  SELECT * INTO v_tier
    FROM gw_ticket_tiers
   WHERE id = v_order.tier_id
   FOR UPDATE;

  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('error', 'tier_not_found');
  END IF;

  IF v_tier.quantity_sold + v_order.quantity > v_tier.quantity_total THEN
    -- Buyer's card was charged but we can't seat them. Caller is
    -- responsible for refunding via Stripe and notifying the buyer.
    RETURN jsonb_build_object(
      'error', 'over_capacity',
      'order_id', v_order.id,
      'sold', v_tier.quantity_sold,
      'total', v_tier.quantity_total,
      'requested', v_order.quantity
    );
  END IF;

  -- Increment seats sold.
  UPDATE gw_ticket_tiers
     SET quantity_sold = quantity_sold + v_order.quantity
   WHERE id = v_tier.id;

  -- Mint one ticket row per seat. Each ticket gets a signed token of
  -- the form "<uuid>.<hex_hmac>" so a door scanner can verify it
  -- without a DB lookup.
  FOR i IN 1 .. v_order.quantity LOOP
    v_ticket_id := gen_random_uuid();
    v_token := v_ticket_id::text || '.' ||
               encode(
                 hmac(v_ticket_id::text, p_signing_secret, 'sha256'),
                 'hex'
               );
    INSERT INTO gw_tickets
      (id, tenant_id, order_id, tier_id, event_id, token, status, is_comp, holder_name)
    VALUES
      (v_ticket_id, v_order.tenant_id, v_order.id, v_tier.id, v_order.event_id,
       v_token, 'valid', false, v_order.buyer_name);
    v_tickets := v_tickets || jsonb_build_object(
      'id',   v_ticket_id,
      'token', v_token,
      'tier_name', v_tier.name
    );
  END LOOP;

  -- Promote the order. stripe_checkout_session_id is already set from
  -- the box-office-checkout edge function, but we re-assert it here so
  -- a webhook arriving before the edge function's PATCH lands wins too.
  UPDATE gw_ticket_orders
     SET status = 'paid',
         stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, p_session_id),
         stripe_payment_intent_id   = p_payment_intent_id,
         updated_at = now()
   WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'access_token', v_order.access_token,
    'tenant_id', v_order.tenant_id,
    'event_id', v_order.event_id,
    'buyer_email', v_order.buyer_email,
    'buyer_name', v_order.buyer_name,
    'tickets', v_tickets
  );
END;
$$;

-- The webhook handler runs as supabase_admin via psql; explicit grants
-- aren't strictly required, but spell them out so we don't surprise
-- ourselves later if the caller changes.
GRANT EXECUTE ON FUNCTION public.gw_box_office_fulfill_order(UUID, TEXT, TEXT, TEXT)
  TO postgres, service_role, supabase_admin;
