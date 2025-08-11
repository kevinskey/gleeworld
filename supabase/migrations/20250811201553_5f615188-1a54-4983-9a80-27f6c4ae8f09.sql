-- Create helper functions for blocked dates to work around TypeScript issues
CREATE OR REPLACE FUNCTION public.get_blocked_dates()
RETURNS TABLE(
  id UUID,
  blocked_date DATE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, blocked_date, reason, created_at, created_by
  FROM public.gw_blocked_dates
  ORDER BY blocked_date ASC;
$$;

CREATE OR REPLACE FUNCTION public.block_date(date_to_block DATE, block_reason TEXT DEFAULT 'Date blocked by admin')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.gw_blocked_dates (blocked_date, reason, created_by)
  VALUES (date_to_block, block_reason, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_date(block_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.gw_blocked_dates WHERE id = block_id;
END;
$$;