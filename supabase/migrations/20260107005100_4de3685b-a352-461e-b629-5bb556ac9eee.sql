-- Create hotels table for tour accommodations
CREATE TABLE public.gw_tour_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_city_id UUID REFERENCES public.gw_tour_cities(id) ON DELETE SET NULL,
  hotel_name TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  website TEXT,
  confirmation_number TEXT,
  check_in_date DATE,
  check_out_date DATE,
  check_in_time TIME,
  check_out_time TIME,
  room_count INTEGER,
  room_rate NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  amenities TEXT[],
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  parking_info TEXT,
  breakfast_included BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_tour_hotels ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to view hotels
CREATE POLICY "Authenticated users can view hotels"
ON public.gw_tour_hotels
FOR SELECT
TO authenticated
USING (true);

-- Policies for admins and tour managers to manage hotels
CREATE POLICY "Admins can manage hotels"
ON public.gw_tour_hotels
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND position = 'tour_manager'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND position = 'tour_manager'
    AND is_active = true
  )
);

-- Create index for faster lookups
CREATE INDEX idx_gw_tour_hotels_city ON public.gw_tour_hotels(tour_city_id);
CREATE INDEX idx_gw_tour_hotels_dates ON public.gw_tour_hotels(check_in_date, check_out_date);