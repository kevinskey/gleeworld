-- Refund-aware seat sharing. partial_refund is now a normal state for an
-- order whose OTHER items were refunded — sharing must keep working on the
-- surviving items, while the refunded item itself must stop accepting new
-- shares (its existing shares were deleted at refund time). Faithful
-- re-create of 20260803210000's share_partner_purchase with only the two
-- status checks changed.
create or replace function public.share_partner_purchase(p_order_item_id uuid, p_user_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_item record;
  v_seats int;
  v_used int;
begin
  select oi.id, oi.quantity, oi.partner_score_id, oi.refunded_at,
         o.buyer_user_id, o.status as order_status
    into v_item
    from gw_partner_order_items oi
    join gw_partner_orders o on o.id = oi.order_id
   where oi.id = p_order_item_id;
  if not found then
    raise exception 'purchase not found';
  end if;
  if v_item.buyer_user_id <> auth.uid() then
    raise exception 'not your purchase';
  end if;
  if v_item.order_status not in ('paid', 'partial_refund') then
    raise exception 'order is not paid';
  end if;
  if v_item.refunded_at is not null then
    raise exception 'this purchase was refunded';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you already have access as the buyer';
  end if;
  if not exists (select 1 from gw_profiles where user_id = p_user_id) then
    raise exception 'recipient is not a GleeWorld user';
  end if;

  v_seats := greatest(v_item.quantity - 1, 0);
  perform pg_advisory_xact_lock(hashtext(p_order_item_id::text));
  select count(*) into v_used from gw_partner_score_shares where order_item_id = p_order_item_id;
  if v_used >= v_seats then
    raise exception 'all % seat(s) are in use — buy more copies to share with more students', v_seats;
  end if;

  insert into gw_partner_score_shares (order_item_id, partner_score_id, owner_user_id, shared_with_user_id)
  values (p_order_item_id, v_item.partner_score_id, auth.uid(), p_user_id)
  on conflict (order_item_id, shared_with_user_id) do nothing;

  select count(*) into v_used from gw_partner_score_shares where order_item_id = p_order_item_id;
  return jsonb_build_object('seats_total', v_seats, 'seats_used', v_used);
end
$$;
