-- Create comprehensive budget worksheet schema for non-performance events

-- Extend events table with budget-specific fields
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS volunteers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS guest_speakers TEXT,
ADD COLUMN IF NOT EXISTS honoraria NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS misc_supplies NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_fees NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contingency NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ticket_sales NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS donations NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS club_support NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_status TEXT DEFAULT 'draft' CHECK (budget_status IN ('draft', 'pending_approval', 'approved', 'rejected'));

-- Create food_budget table
CREATE TABLE IF NOT EXISTS public.food_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
  vendor_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create materials_budget table
CREATE TABLE IF NOT EXISTS public.materials_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  purpose TEXT,
  qty INTEGER DEFAULT 1,
  cost NUMERIC(10,2) DEFAULT 0,
  vendor_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transport_budget table
CREATE TABLE IF NOT EXISTS public.transport_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media_budget table
CREATE TABLE IF NOT EXISTS public.media_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  cost NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promo_budget table
CREATE TABLE IF NOT EXISTS public.promo_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget_attachments table
CREATE TABLE IF NOT EXISTS public.budget_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.food_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget tables
-- Food budget policies
CREATE POLICY "Users can manage food budget for events they have access to" ON public.food_budget
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = food_budget.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = coordinator_id OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

-- Materials budget policies
CREATE POLICY "Users can manage materials budget for events they have access to" ON public.materials_budget
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = materials_budget.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = coordinator_id OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

-- Transport budget policies
CREATE POLICY "Users can manage transport budget for events they have access to" ON public.transport_budget
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = transport_budget.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = coordinator_id OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

-- Media budget policies
CREATE POLICY "Users can manage media budget for events they have access to" ON public.media_budget
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = media_budget.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = coordinator_id OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

-- Promo budget policies
CREATE POLICY "Users can manage promo budget for events they have access to" ON public.promo_budget
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = promo_budget.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = coordinator_id OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

-- Budget attachments policies
CREATE POLICY "Users can manage budget attachments for events they have access to" ON public.budget_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = budget_attachments.event_id 
      AND (
        auth.uid() = created_by OR 
        auth.uid() = coordinator_id OR 
        auth.uid() = event_lead_id OR
        EXISTS (SELECT 1 FROM public.event_team_members WHERE event_id = events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
      )
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_food_budget_updated_at
    BEFORE UPDATE ON public.food_budget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_budget_updated_at
    BEFORE UPDATE ON public.materials_budget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_budget_updated_at
    BEFORE UPDATE ON public.transport_budget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_budget_updated_at
    BEFORE UPDATE ON public.media_budget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_budget_updated_at
    BEFORE UPDATE ON public.promo_budget
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate budget totals
CREATE OR REPLACE FUNCTION public.calculate_event_budget_totals(event_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  total_exp NUMERIC(10,2) := 0;
  total_inc NUMERIC(10,2) := 0;
  net_amt NUMERIC(10,2) := 0;
  food_total NUMERIC(10,2) := 0;
  materials_total NUMERIC(10,2) := 0;
  transport_total NUMERIC(10,2) := 0;
  media_total NUMERIC(10,2) := 0;
  promo_total NUMERIC(10,2) := 0;
  event_record RECORD;
BEGIN
  -- Get current event data
  SELECT honoraria, misc_supplies, admin_fees, contingency, ticket_sales, donations, club_support
  INTO event_record
  FROM public.events WHERE id = event_id_param;
  
  -- Calculate totals from budget tables
  SELECT COALESCE(SUM(total), 0) INTO food_total FROM public.food_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO materials_total FROM public.materials_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO transport_total FROM public.transport_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO media_total FROM public.media_budget WHERE event_id = event_id_param;
  SELECT COALESCE(SUM(cost), 0) INTO promo_total FROM public.promo_budget WHERE event_id = event_id_param;
  
  -- Calculate total expenses
  total_exp := COALESCE(event_record.honoraria, 0) + 
               food_total + 
               materials_total + 
               transport_total + 
               media_total + 
               promo_total + 
               COALESCE(event_record.misc_supplies, 0) + 
               COALESCE(event_record.admin_fees, 0) + 
               COALESCE(event_record.contingency, 0);
  
  -- Calculate total income
  total_inc := COALESCE(event_record.ticket_sales, 0) + 
               COALESCE(event_record.donations, 0) + 
               COALESCE(event_record.club_support, 0);
  
  -- Calculate net total
  net_amt := total_inc - total_exp;
  
  -- Update the event record
  UPDATE public.events 
  SET 
    total_expenses = total_exp,
    total_income = total_inc,
    net_total = net_amt,
    updated_at = now()
  WHERE id = event_id_param;
END;
$$;

-- Trigger function to auto-calculate totals when budget items change
CREATE OR REPLACE FUNCTION public.update_event_budget_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine the event_id based on the table
  IF TG_TABLE_NAME = 'food_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'materials_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'transport_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'media_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'promo_budget' THEN
    PERFORM calculate_event_budget_totals(COALESCE(NEW.event_id, OLD.event_id));
  ELSIF TG_TABLE_NAME = 'events' THEN
    PERFORM calculate_event_budget_totals(NEW.id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-calculate totals
CREATE TRIGGER trigger_update_budget_totals_food
    AFTER INSERT OR UPDATE OR DELETE ON public.food_budget
    FOR EACH ROW EXECUTE FUNCTION update_event_budget_totals();

CREATE TRIGGER trigger_update_budget_totals_materials
    AFTER INSERT OR UPDATE OR DELETE ON public.materials_budget
    FOR EACH ROW EXECUTE FUNCTION update_event_budget_totals();

CREATE TRIGGER trigger_update_budget_totals_transport
    AFTER INSERT OR UPDATE OR DELETE ON public.transport_budget
    FOR EACH ROW EXECUTE FUNCTION update_event_budget_totals();

CREATE TRIGGER trigger_update_budget_totals_media
    AFTER INSERT OR UPDATE OR DELETE ON public.media_budget
    FOR EACH ROW EXECUTE FUNCTION update_event_budget_totals();

CREATE TRIGGER trigger_update_budget_totals_promo
    AFTER INSERT OR UPDATE OR DELETE ON public.promo_budget
    FOR EACH ROW EXECUTE FUNCTION update_event_budget_totals();

CREATE TRIGGER trigger_update_budget_totals_events
    AFTER UPDATE OF honoraria, misc_supplies, admin_fees, contingency, ticket_sales, donations, club_support
    ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_event_budget_totals();