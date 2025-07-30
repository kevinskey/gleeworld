-- Fix function search path mutable warnings by setting proper search_path
CREATE OR REPLACE FUNCTION public.update_annotation_shares_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;