-- Create logistics and support tables

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

-- Enable RLS
ALTER TABLE gw_tour_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tour_tasks ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for tour tasks
CREATE POLICY "Tour managers and admins can manage tour tasks" ON gw_tour_tasks
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tour_cities_tour_id ON gw_tour_cities(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_cities_order ON gw_tour_cities(tour_id, city_order);
CREATE INDEX IF NOT EXISTS idx_tour_logistics_tour_city_id ON gw_tour_logistics(tour_city_id);
CREATE INDEX IF NOT EXISTS idx_tour_participants_tour_id ON gw_tour_participants(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_participants_user_id ON gw_tour_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_tasks_tour_id ON gw_tour_tasks(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_tasks_city_id ON gw_tour_tasks(tour_city_id);