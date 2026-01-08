-- Add display_order column to advertising_hero table
ALTER TABLE public.advertising_hero 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Update existing records to have sequential display_order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM public.advertising_hero
)
UPDATE public.advertising_hero 
SET display_order = ordered.rn
FROM ordered
WHERE public.advertising_hero.id = ordered.id;