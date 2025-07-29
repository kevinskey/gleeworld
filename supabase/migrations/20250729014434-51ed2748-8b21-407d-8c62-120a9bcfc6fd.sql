-- Create tour planner database tables

-- Main tours table
CREATE TABLE IF NOT EXISTS gw_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  number_of_singers INTEGER DEFAULT 0,
  budget DECIMAL(10,2),
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'planning', 'confirmed', 'archived')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Detailed logistics per city
CREATE TABLE IF NOT EXISTS gw_tour_logistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_city_id UUID NOT NULL REFERENCES gw_tour_cities(id) ON DELETE CASCADE,
  lodging_name TEXT,
  lodging_address TEXT,
  lodging_contact TEXT,
  check_in_time TIME,
  check_out_time TIME,
  venue_name TEXT,
  venue_address TEXT,
  venue_contact TEXT,
  venue_phone TEXT,
  venue_email TEXT,
  rehearsal_time TIMESTAMP WITH TIME ZONE,
  show_time TIMESTAMP WITH TIME ZONE,
  estimated_audience_size INTEGER,
  hospitality_notes TEXT,
  meal_arrangements TEXT,
  transport_notes TEXT,
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

-- Tour tasks/checklist
CREATE TABLE IF NOT EXISTS gw_tour_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES gw_tours(id) ON DELETE CASCADE,
  tour_city_id UUID REFERENCES gw_tour_cities(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  due_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tour documents (contracts, venue docs, etc.)
CREATE TABLE IF NOT EXISTS gw_tour_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES gw_tours(id) ON DELETE CASCADE,
  tour_city_id UUID REFERENCES gw_tour_cities(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE gw_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tour_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tour_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tour_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tour_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tour_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tours
CREATE POLICY "Tour managers and admins can manage tours" ON gw_tours
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

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

-- RLS Policies for tour logistics
CREATE POLICY "Tour managers and admins can manage tour logistics" ON gw_tour_logistics
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

CREATE POLICY "Users can view logistics for tours they're participating in" ON gw_tour_logistics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM gw_tour_cities tc
    JOIN gw_tours t ON tc.tour_id = t.id
    JOIN gw_tour_participants tp ON t.id = tp.tour_id
    WHERE tc.id = gw_tour_logistics.tour_city_id 
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

-- RLS Policies for tour tasks
CREATE POLICY "Tour managers and admins can manage tour tasks" ON gw_tour_tasks
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

-- RLS Policies for tour documents
CREATE POLICY "Tour managers and admins can manage tour documents" ON gw_tour_documents
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

-- Create indexes for performance
CREATE INDEX idx_tour_cities_tour_id ON gw_tour_cities(tour_id);
CREATE INDEX idx_tour_cities_order ON gw_tour_cities(tour_id, city_order);
CREATE INDEX idx_tour_logistics_tour_city_id ON gw_tour_logistics(tour_city_id);
CREATE INDEX idx_tour_participants_tour_id ON gw_tour_participants(tour_id);
CREATE INDEX idx_tour_participants_user_id ON gw_tour_participants(user_id);
CREATE INDEX idx_tour_tasks_tour_id ON gw_tour_tasks(tour_id);
CREATE INDEX idx_tour_tasks_city_id ON gw_tour_tasks(tour_city_id);
CREATE INDEX idx_tour_documents_tour_id ON gw_tour_documents(tour_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gw_tours_updated_at BEFORE UPDATE ON gw_tours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gw_tour_cities_updated_at BEFORE UPDATE ON gw_tour_cities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gw_tour_logistics_updated_at BEFORE UPDATE ON gw_tour_logistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gw_tour_participants_updated_at BEFORE UPDATE ON gw_tour_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gw_tour_tasks_updated_at BEFORE UPDATE ON gw_tour_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();