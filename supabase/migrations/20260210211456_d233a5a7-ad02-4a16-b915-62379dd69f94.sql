
-- Create risers table to persist riser position assignments
CREATE TABLE public.gw_tour_risers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL DEFAULT 'Default',
  row_number INT NOT NULL CHECK (row_number >= 1 AND row_number <= 4),
  position INT NOT NULL CHECK (position >= 1 AND position <= 12),
  user_id UUID NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_name, row_number, position)
);

ALTER TABLE public.gw_tour_risers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view risers"
  ON public.gw_tour_risers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and exec can manage risers"
  ON public.gw_tour_risers FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_gw_tour_risers_updated_at
  BEFORE UPDATE ON public.gw_tour_risers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
