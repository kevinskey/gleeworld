CREATE TABLE IF NOT EXISTS public.gw_tour_driver_tip_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  driver_name TEXT NOT NULL,
  bus_company_name TEXT NULL,
  driver_phone TEXT NULL,
  payment_method TEXT NULL,
  signed_by_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  notes TEXT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_tour_driver_tip_receipts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gw_tour_driver_tip_receipts_tour_id
  ON public.gw_tour_driver_tip_receipts (tour_id);

CREATE INDEX IF NOT EXISTS idx_gw_tour_driver_tip_receipts_signed_at
  ON public.gw_tour_driver_tip_receipts (signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_gw_tour_driver_tip_receipts_created_by
  ON public.gw_tour_driver_tip_receipts (created_by);

CREATE OR REPLACE FUNCTION public.set_gw_tour_driver_tip_receipts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_tour_driver_tip_receipts_updated_at
ON public.gw_tour_driver_tip_receipts;

CREATE TRIGGER trg_gw_tour_driver_tip_receipts_updated_at
BEFORE UPDATE ON public.gw_tour_driver_tip_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_gw_tour_driver_tip_receipts_updated_at();

DROP POLICY IF EXISTS "Authenticated users can view driver tip receipts"
ON public.gw_tour_driver_tip_receipts;
CREATE POLICY "Authenticated users can view driver tip receipts"
ON public.gw_tour_driver_tip_receipts
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert driver tip receipts"
ON public.gw_tour_driver_tip_receipts;
CREATE POLICY "Authenticated users can insert driver tip receipts"
ON public.gw_tour_driver_tip_receipts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Receipt creators can update driver tip receipts"
ON public.gw_tour_driver_tip_receipts;
CREATE POLICY "Receipt creators can update driver tip receipts"
ON public.gw_tour_driver_tip_receipts
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Receipt creators can delete driver tip receipts"
ON public.gw_tour_driver_tip_receipts;
CREATE POLICY "Receipt creators can delete driver tip receipts"
ON public.gw_tour_driver_tip_receipts
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);