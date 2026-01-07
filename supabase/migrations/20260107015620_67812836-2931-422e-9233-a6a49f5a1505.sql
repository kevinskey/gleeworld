-- Drop the restrictive policies for tour_budget_items
DROP POLICY IF EXISTS "Admins and tour managers can manage tour budget items" ON public.tour_budget_items;

-- Create separate policies for each operation that allow all authenticated users
CREATE POLICY "Authenticated users can insert tour budget items"
ON public.tour_budget_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tour budget items"
ON public.tour_budget_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tour budget items"
ON public.tour_budget_items FOR DELETE
TO authenticated
USING (true);

-- Drop the restrictive policies for tour_budget_revenues
DROP POLICY IF EXISTS "Admins and tour managers can manage tour budget revenues" ON public.tour_budget_revenues;

-- Create separate policies for each operation that allow all authenticated users
CREATE POLICY "Authenticated users can insert tour budget revenues"
ON public.tour_budget_revenues FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tour budget revenues"
ON public.tour_budget_revenues FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tour budget revenues"
ON public.tour_budget_revenues FOR DELETE
TO authenticated
USING (true);