-- Create tour_budget_items table for storing tour budget line items
CREATE TABLE public.tour_budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID REFERENCES public.gw_tours(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  estimated_cost NUMERIC GENERATED ALWAYS AS (unit_cost * quantity) STORED,
  actual_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'paid')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tour_budget_revenues table for storing tour revenue sources
CREATE TABLE public.tour_budget_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID REFERENCES public.gw_tours(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'confirmed', 'received')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tour_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_budget_revenues ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view budget data
CREATE POLICY "Authenticated users can view tour budget items"
ON public.tour_budget_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view tour budget revenues"
ON public.tour_budget_revenues FOR SELECT
TO authenticated
USING (true);

-- Create policies for admins and tour managers to manage budget data
CREATE POLICY "Admins and tour managers can manage tour budget items"
ON public.tour_budget_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
  OR is_current_user_tour_manager()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
  OR is_current_user_tour_manager()
);

CREATE POLICY "Admins and tour managers can manage tour budget revenues"
ON public.tour_budget_revenues FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
  OR is_current_user_tour_manager()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
  OR is_current_user_tour_manager()
);

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_budget_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_budget_revenues;

-- Create indexes
CREATE INDEX idx_tour_budget_items_tour_id ON public.tour_budget_items(tour_id);
CREATE INDEX idx_tour_budget_items_category ON public.tour_budget_items(category);
CREATE INDEX idx_tour_budget_revenues_tour_id ON public.tour_budget_revenues(tour_id);