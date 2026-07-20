-- Tier price round-up (2026-07-20, per Kevin) — from the .99 endings we
-- landed at earlier today to clean whole-dollar prices.
--
-- Personal:   $12.99  -> $15
-- Director:   $49.99  -> $50
-- Director+:  $69.99  -> $65  (deliberate drop; narrows the Director gap)
-- Institution: $259.99 -> $250
--
-- Annual math preserved: Personal 3 months free, tenant tiers 2 months free.

UPDATE public.gw_billing_plans SET monthly_price_cents = 1500,  annual_price_cents = 13500  WHERE id = 'personal';
UPDATE public.gw_billing_plans SET monthly_price_cents = 5000,  annual_price_cents = 50000  WHERE id = 'director_60';
UPDATE public.gw_billing_plans SET monthly_price_cents = 6500,  annual_price_cents = 65000  WHERE id = 'director_150';
UPDATE public.gw_billing_plans SET monthly_price_cents = 25000, annual_price_cents = 250000 WHERE id = 'institution';
