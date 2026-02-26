
-- Invoice maker table for Spelman College Glee Club
CREATE TABLE public.gw_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Donor/Host info
  donor_name TEXT NOT NULL,
  donor_organization TEXT,
  donor_address TEXT,
  donor_city TEXT,
  donor_state TEXT,
  donor_zip TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  
  -- Director info
  director_name TEXT NOT NULL DEFAULT 'Dr. Kevin Phillip Johnson',
  director_title TEXT NOT NULL DEFAULT 'Director, Spelman College Glee Club',
  
  -- Line items stored as JSONB array
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Totals
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Invoice metadata
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  due_date DATE,
  
  -- Media library link
  media_id UUID REFERENCES public.gw_media_library(id) ON DELETE SET NULL,
  pdf_url TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-increment invoice number sequence
CREATE SEQUENCE public.gw_invoice_number_seq START 1001;

-- Enable RLS
ALTER TABLE public.gw_invoices ENABLE ROW LEVEL SECURITY;

-- Admin/exec can do everything
CREATE POLICY "Admins can manage invoices"
ON public.gw_invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
      OR gw_profiles.is_exec_board = true
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
      OR gw_profiles.is_exec_board = true
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_gw_invoices_updated_at
BEFORE UPDATE ON public.gw_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
