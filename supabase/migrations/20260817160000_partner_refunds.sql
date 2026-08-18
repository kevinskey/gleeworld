-- Partner store sub-plan 3: refunds + suspend enforcement.

-- Item-level refund state. The item is the refund unit (one item = one
-- score = one My Music entitlement); order.status stays derived
-- ('refunded' when all items refunded, else 'partial_refund').
ALTER TABLE public.gw_partner_order_items
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text;

-- Suspend enforcement at the DB layer: a suspended partner's published
-- catalog disappears from every public listing (store tab, storefront,
-- featured shelves, search) without frontend changes. Owner and admin
-- policies are untouched, so a suspended partner still sees their own
-- scores in the portal.
DROP POLICY IF EXISTS gw_partner_scores_public_read ON public.gw_partner_scores;
CREATE POLICY gw_partner_scores_public_read
  ON public.gw_partner_scores FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.gw_partners p
      WHERE p.id = gw_partner_scores.partner_id
        AND p.status = 'active'
    )
  );

NOTIFY pgrst, 'reload schema';
