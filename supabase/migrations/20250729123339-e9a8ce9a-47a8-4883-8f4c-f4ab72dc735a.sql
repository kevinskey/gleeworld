-- Add missing policies and functions if they don't exist

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_spiritual_reflections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set shared_at when is_shared_to_members becomes true
  IF OLD.is_shared_to_members = false AND NEW.is_shared_to_members = true THEN
    NEW.shared_at = now();
  ELSIF OLD.is_shared_to_members = true AND NEW.is_shared_to_members = false THEN
    NEW.shared_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_spiritual_reflections_updated_at ON public.gw_spiritual_reflections;
CREATE TRIGGER update_spiritual_reflections_updated_at
BEFORE UPDATE ON public.gw_spiritual_reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_spiritual_reflections_updated_at();