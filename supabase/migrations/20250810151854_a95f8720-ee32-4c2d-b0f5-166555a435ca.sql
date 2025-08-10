-- Enforce owner-only deletion for gw_buckets_of_love
-- 1) Create or replace the enforcement function
CREATE OR REPLACE FUNCTION public.ensure_bol_owner_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure only the owner can delete their bucket
  IF auth.uid() IS NULL OR auth.uid() <> OLD.user_id THEN
    RAISE EXCEPTION 'Only the owner can delete this bucket.' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

-- 2) Recreate the trigger safely
DROP TRIGGER IF EXISTS trg_gw_bol_owner_delete ON public.gw_buckets_of_love;
CREATE TRIGGER trg_gw_bol_owner_delete
BEFORE DELETE ON public.gw_buckets_of_love
FOR EACH ROW
EXECUTE FUNCTION public.ensure_bol_owner_delete();

-- 3) Add a DELETE policy (effective if RLS is enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'gw_buckets_of_love' AND p.polcmd = 'd' AND p.polname = 'Users can delete their own buckets'
  ) THEN
    CREATE POLICY "Users can delete their own buckets"
    ON public.gw_buckets_of_love
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;