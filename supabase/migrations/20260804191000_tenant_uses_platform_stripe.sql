-- Explicit opt-in for a tenant to sell through the PLATFORM Stripe account.
--
-- Commerce Rule 4 says the account that collects is resolved server-side and
-- "a tenant can never sell through another tenant's (or the platform's)
-- account". That rule exists to stop tenant B from routing money into someone
-- else's account, and it stays enforced: the checkout function still refuses
-- the platform account unless THIS flag is explicitly true for that tenant.
--
-- The one legitimate case is the platform operator's own tenant. The GleeWorld
-- platform Stripe account (acct_1RUiPb…) belongs to Kevin Johnson personally,
-- and `kevin` is his own tenant — so for that tenant "the platform account" and
-- "the tenant's own account" are the same bank account. Rather than send him
-- through Connect onboarding to link an account to itself (which Stripe
-- rejects), we mark the tenant.
--
-- Default false. Setting this true for a tenant you do not own means handing
-- them your money — it is deliberately not settable from any tenant-facing UI.

ALTER TABLE public.gw_tenants
  ADD COLUMN IF NOT EXISTS uses_platform_stripe BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.gw_tenants.uses_platform_stripe IS
  'When true, this tenant''s box-office/ticket checkouts are charged on the '
  'platform Stripe account instead of a Connect account. Only ever true for '
  'tenants owned by the platform operator. Superadmin-only.';

UPDATE public.gw_tenants
   SET uses_platform_stripe = true
 WHERE slug = 'kevin';
