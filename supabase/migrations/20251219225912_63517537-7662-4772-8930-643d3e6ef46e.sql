-- Add Amazon affiliate tag column to advertising_hero
ALTER TABLE public.advertising_hero 
ADD COLUMN amazon_affiliate_tag TEXT;