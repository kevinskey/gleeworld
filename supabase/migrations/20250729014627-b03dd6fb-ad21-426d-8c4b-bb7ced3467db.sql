-- Create remaining tour planner tables

-- Tour cities with order and basic info
CREATE TABLE IF NOT EXISTS gw_tour_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES gw_tours(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  state_code TEXT,
  country_code TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city_order INTEGER NOT NULL,
  arrival_date DATE,
  departure_date DATE,
  city_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tour participants/singers
CREATE TABLE IF NOT EXISTS gw_tour_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES gw_tours(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  voice_part TEXT,
  room_assignment TEXT,
  dietary_restrictions TEXT,
  emergency_contact TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tour_id, user_id)
);

-- Enable RLS
ALTER TABLE gw_tour_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tour_participants ENABLE ROW LEVEL SECURITY;

-- Add policies for participants view policy for tours
CREATE POLICY "Users can view confirmed tours they're participating in" ON gw_tours
FOR SELECT USING (
  status = 'confirmed' 
  AND EXISTS (
    SELECT 1 FROM gw_tour_participants 
    WHERE tour_id = gw_tours.id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for tour cities
CREATE POLICY "Tour managers and admins can manage tour cities" ON gw_tour_cities
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

CREATE POLICY "Users can view cities for tours they're participating in" ON gw_tour_cities
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM gw_tours t 
    JOIN gw_tour_participants tp ON t.id = tp.tour_id
    WHERE t.id = gw_tour_cities.tour_id 
    AND tp.user_id = auth.uid()
    AND t.status = 'confirmed'
  )
);

-- RLS Policies for tour participants
CREATE POLICY "Tour managers and admins can manage tour participants" ON gw_tour_participants
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

CREATE POLICY "Users can view their own tour participation" ON gw_tour_participants
FOR SELECT USING (user_id = auth.uid());