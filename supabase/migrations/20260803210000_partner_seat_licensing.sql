-- Seat-based licensing for partner store purchases (Kevin's model, 2026-08-03):
-- the purchased QUANTITY is the number of people INCLUDING the buyer who may
-- use the score in the app. The buyer can share the purchase with
-- (quantity - 1) members; shared members get view-in-app access only, and
-- shares are reassignable (deleting one frees the seat).
--
-- gw_partner_* tables are platform-level (the store is cross-tenant by
-- design) — no tenant_id here, matching the parent tables.

alter table public.gw_partner_order_items
  add column if not exists quantity int not null default 1 check (quantity >= 1);

create table if not exists public.gw_partner_score_shares (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.gw_partner_order_items(id) on delete cascade,
  partner_score_id uuid not null references public.gw_partner_scores(id) on delete cascade,
  owner_user_id uuid not null,
  shared_with_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (order_item_id, shared_with_user_id)
);

create index if not exists gw_partner_score_shares_recipient_idx
  on public.gw_partner_score_shares (shared_with_user_id);

alter table public.gw_partner_score_shares enable row level security;

-- Owner sees and revokes their shares; recipients see rows shared to them.
-- Deliberately NO insert policy: seat-capped inserts only via the RPC below.
drop policy if exists shares_select on public.gw_partner_score_shares;
create policy shares_select on public.gw_partner_score_shares
  for select to authenticated
  using (owner_user_id = auth.uid() or shared_with_user_id = auth.uid());

drop policy if exists shares_owner_delete on public.gw_partner_score_shares;
create policy shares_owner_delete on public.gw_partner_score_shares
  for delete to authenticated
  using (owner_user_id = auth.uid());

-- Share a purchased score with another user, enforcing the seat cap.
-- Buyer occupies one seat, so shareable seats = quantity - 1. Advisory
-- xact lock serializes concurrent shares on the same purchase so the cap
-- can't be raced past.
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
  select oi.id, oi.quantity, oi.partner_score_id, o.buyer_user_id, o.status as order_status
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
  if v_item.order_status <> 'paid' then
    raise exception 'order is not paid';
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

revoke all on function public.share_partner_purchase(uuid, uuid) from public;
grant execute on function public.share_partner_purchase(uuid, uuid) to authenticated;

-- Everything shared TO me, with enough joined metadata to render a list
-- and open the viewer (via partner-download-url, which now honors shares).
create or replace function public.my_shared_partner_scores()
returns table (
  share_id uuid,
  order_item_id uuid,
  partner_score_id uuid,
  title text,
  composer text,
  voicing text,
  owner_name text,
  shared_at timestamptz
)
language sql security definer
set search_path = public
stable
as $$
  select sh.id, sh.order_item_id, sh.partner_score_id,
         ps.title, ps.composer, ps.voicing,
         coalesce(p.full_name, 'A GleeWorld member'),
         sh.created_at
    from gw_partner_score_shares sh
    join gw_partner_scores ps on ps.id = sh.partner_score_id
    left join gw_profiles p on p.user_id = sh.owner_user_id
   where sh.shared_with_user_id = auth.uid()
   order by sh.created_at desc;
$$;

revoke all on function public.my_shared_partner_scores() from public;
grant execute on function public.my_shared_partner_scores() to authenticated;
