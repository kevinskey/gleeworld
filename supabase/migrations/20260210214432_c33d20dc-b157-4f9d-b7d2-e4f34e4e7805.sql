
-- Bus seating assignments table
-- 25 rows x 4 seats (A, B | aisle | C, D), some members can occupy 2 seats
CREATE TABLE public.gw_bus_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  row_number INTEGER NOT NULL CHECK (row_number BETWEEN 1 AND 25),
  seat_letter TEXT NOT NULL CHECK (seat_letter IN ('A', 'B', 'C', 'D')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_double_seat BOOLEAN NOT NULL DEFAULT false,
  -- if true, this seat is the "extra" seat claimed by the adjacent occupant
  paired_with_seat_id UUID REFERENCES public.gw_bus_seats(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (row_number, seat_letter)
);

-- Enable RLS
ALTER TABLE public.gw_bus_seats ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all seats
CREATE POLICY "Authenticated users can view bus seats"
  ON public.gw_bus_seats FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can manage seats (admin enforcement at app level)
CREATE POLICY "Authenticated users can insert bus seats"
  ON public.gw_bus_seats FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update bus seats"
  ON public.gw_bus_seats FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete bus seats"
  ON public.gw_bus_seats FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Pre-populate all 100 seats (25 rows x 4 seats)
INSERT INTO public.gw_bus_seats (row_number, seat_letter)
SELECT r, s
FROM generate_series(1, 25) AS r,
     unnest(ARRAY['A', 'B', 'C', 'D']) AS s
ORDER BY r, s;
