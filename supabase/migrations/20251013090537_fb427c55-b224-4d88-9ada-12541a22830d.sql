-- Add volume column to alumnae_newsletters
ALTER TABLE public.alumnae_newsletters 
ADD COLUMN IF NOT EXISTS volume integer DEFAULT 1;

-- Create function to reorder volumes after deletion
CREATE OR REPLACE FUNCTION public.reorder_newsletter_volumes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Decrease volume number for all newsletters in the same year with higher volumes
  UPDATE public.alumnae_newsletters
  SET volume = volume - 1
  WHERE year = OLD.year 
  AND volume > OLD.volume;
  
  RETURN OLD;
END;
$$;

-- Create trigger to reorder volumes on newsletter deletion
DROP TRIGGER IF EXISTS reorder_volumes_on_delete ON public.alumnae_newsletters;
CREATE TRIGGER reorder_volumes_on_delete
  AFTER DELETE ON public.alumnae_newsletters
  FOR EACH ROW
  EXECUTE FUNCTION public.reorder_newsletter_volumes();