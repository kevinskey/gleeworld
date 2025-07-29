-- Create tour planner database tables step by step

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

-- Enable RLS on tours table
ALTER TABLE gw_tours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tours
CREATE POLICY "Tour managers and admins can manage tours" ON gw_tours
FOR ALL USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);