-- Add missing columns that the profile form expects
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS twitter text;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS youtube text;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS classification text;