-- Enforce owner-only deletion for gw_buckets_of_love without breaking existing reads/inserts
-- 1) Create a security definer function to ensure only the owner can delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'ensure_bol_owner_delete'
  ) THEN
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
  END IF;
END $$;

-- 2) Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_gw_bol_owner_delete'
  ) THEN
    CREATE TRIGGER trg_gw_bol_owner_delete
    BEFORE DELETE ON public.gw_buckets_of_love
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_bol_owner_delete();
  END IF;
END $$;

-- 3) Optionally add a DELETE policy (harmless if RLS disabled; enforced if enabled)
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