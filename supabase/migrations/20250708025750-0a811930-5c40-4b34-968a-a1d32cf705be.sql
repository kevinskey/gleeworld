-- Create events table for event planning
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other' CHECK (event_type IN ('tour_stop', 'social', 'banquet', 'fundraiser', 'worship_event', 'travel', 'volunteer', 'meeting', 'other')),
  event_date_start DATE NOT NULL,
  event_date_end DATE,
  event_location TEXT,
  is_travel_involved BOOLEAN DEFAULT FALSE,
  expected_headcount INTEGER,
  no_sing_rest_required BOOLEAN DEFAULT FALSE,
  no_sing_rest_date_start DATE,
  no_sing_rest_date_end DATE,
  brief_description TEXT,
  event_lead_id UUID REFERENCES auth.users(id),
  faculty_advisor TEXT,
  approval_needed BOOLEAN DEFAULT FALSE,
  date_submitted_for_approval DATE,
  approved BOOLEAN DEFAULT FALSE,
  approver_name TEXT,
  approval_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_line_items table for budget line items
CREATE TABLE public.event_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'venue', 'supplies', 'travel', 'music', 'tech', 'printing', 'swag', 'games', 'decor', 'staff', 'other')),
  item_description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  vendor_store TEXT,
  amazon_url TEXT,
  assigned_to_id UUID REFERENCES auth.users(id),
  purchase_date_planned DATE,
  purchase_status TEXT DEFAULT 'to_order' CHECK (purchase_status IN ('to_order', 'ordered', 'received', 'paid')),
  receipt_url TEXT,
  paid_from TEXT DEFAULT 'glee_fund' CHECK (paid_from IN ('glee_fund', 'club_funds', 'dept_budget', 'student_funds_reimbursable', 'ticket_sales', 'donor')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_team_members table for team assignments
CREATE TABLE public.event_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member', 'faculty_advisor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can create their own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view events they created or are team members of" ON public.events
  FOR SELECT USING (
    auth.uid() = created_by OR 
    auth.uid() = event_lead_id OR
    EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
  );

CREATE POLICY "Event creators and leads can update events" ON public.events
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() = event_lead_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
  );

CREATE POLICY "Event creators can delete events" ON public.events
  FOR DELETE USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
  );

-- RLS Policies for event_line_items
CREATE POLICY "Users can create line items for events they have access to" ON public.event_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_line_items.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can view line items for events they have access to" ON public.event_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_line_items.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

CREATE POLICY "Users can update line items for events they have access to" ON public.event_line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_line_items.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete line items for events they have access to" ON public.event_line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_line_items.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid())
      )
    )
  );

-- RLS Policies for event_team_members
CREATE POLICY "Event creators and leads can manage team members" ON public.event_team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_team_members.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_line_items_updated_at
    BEFORE UPDATE ON public.event_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();