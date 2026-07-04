CREATE OR REPLACE FUNCTION public.gw_store_fulfill_order(
  p_order_id UUID, p_session_id TEXT, p_payment_intent_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD; v_item RECORD; v_prod RECORD;
  v_ents JSONB := '[]'::jsonb; v_token TEXT;
BEGIN
  SELECT * INTO v_order FROM gw_store_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN
    RETURN jsonb_build_object('already_paid', true, 'order_id', v_order.id);
  END IF;

  -- Lock + decrement stock per line item; block oversell under lock.
  FOR v_item IN SELECT * FROM gw_store_order_items WHERE order_id = v_order.id LOOP
    SELECT * INTO v_prod FROM gw_products WHERE id = v_item.product_id FOR UPDATE;
    IF v_prod.manage_stock AND v_prod.stock_quantity < v_item.quantity THEN
      RETURN jsonb_build_object('error','over_capacity','product_id',v_item.product_id,
        'available', v_prod.stock_quantity, 'requested', v_item.quantity);
    END IF;
    IF v_prod.manage_stock THEN
      UPDATE gw_products SET stock_quantity = stock_quantity - v_item.quantity WHERE id = v_prod.id;
    END IF;
    -- Mint one digital entitlement per digital line (quantity-agnostic: one grant per product per order).
    IF v_item.is_digital THEN
      v_token := encode(gen_random_bytes(24),'hex');
      INSERT INTO gw_store_entitlements (tenant_id, order_id, product_id, buyer_user_id, buyer_email, download_token, expires_at)
      VALUES (v_order.tenant_id, v_order.id, v_item.product_id, v_order.buyer_user_id, v_order.buyer_email, v_token, now() + interval '30 days');
      v_ents := v_ents || jsonb_build_object('product_id', v_item.product_id, 'download_token', v_token);
    END IF;
  END LOOP;

  UPDATE gw_store_orders
     SET status='paid',
         provider_session_id = COALESCE(provider_session_id, p_session_id),
         provider_payment_intent_id = p_payment_intent_id,
         updated_at = now()
   WHERE id = v_order.id;

  RETURN jsonb_build_object('ok',true,'order_id',v_order.id,'tenant_id',v_order.tenant_id,
    'buyer_email',v_order.buyer_email,'entitlements',v_ents);
END $$;

CREATE OR REPLACE FUNCTION public.gw_store_refund_order(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_order RECORD; v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM gw_store_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status = 'refunded' THEN RETURN jsonb_build_object('already_refunded', true); END IF;
  IF v_order.status <> 'paid' THEN RETURN jsonb_build_object('error','not_paid'); END IF;
  FOR v_item IN SELECT * FROM gw_store_order_items WHERE order_id = v_order.id LOOP
    UPDATE gw_products SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id AND manage_stock;
  END LOOP;
  UPDATE gw_store_orders SET status='refunded', updated_at=now() WHERE id=v_order.id;
  RETURN jsonb_build_object('ok', true, 'order_id', v_order.id);
END $$;
