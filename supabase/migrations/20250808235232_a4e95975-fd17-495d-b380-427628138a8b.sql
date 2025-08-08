-- Create enum for host sources
CREATE TYPE host_source AS ENUM ('booking_request', 'contract', 'manual_entry');

-- Create enum for host status
CREATE TYPE host_status AS ENUM ('active', 'inactive', 'potential', 'blacklisted');

-- Create the main hosts table
CREATE TABLE public.hosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Contact Information
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  secondary_contact_name TEXT,
  secondary_contact_email TEXT,
  secondary_contact_phone TEXT,
  
  -- Organization Details
  organization_name TEXT,
  organization_type TEXT, -- church, school, venue, corporate, etc.
  website_url TEXT,
  
  -- Address Information
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Venue Information
  venue_name TEXT,
  venue_capacity INTEGER,
  venue_type TEXT, -- auditorium, church, outdoor, etc.
  has_piano BOOLEAN DEFAULT false,
  has_sound_system BOOLEAN DEFAULT false,
  accessibility_features TEXT,
  
  -- Performance Details
  preferred_event_types TEXT[], -- concert, workshop, masterclass, etc.
  budget_range_min DECIMAL(10,2),
  budget_range_max DECIMAL(10,2),
  typical_audience_size INTEGER,
  preferred_seasons TEXT[], -- spring, summer, fall, winter
  booking_lead_time_months INTEGER,
  
  -- Relationship History
  first_contact_date DATE,
  last_contact_date DATE,
  total_performances INTEGER DEFAULT 0,
  last_performance_date DATE,
  
  -- Administrative
  source host_source NOT NULL,
  status host_status NOT NULL DEFAULT 'potential',
  priority_level INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
  notes TEXT,
  internal_notes TEXT, -- private notes for staff only
  
  -- References to source records
  booking_request_id UUID REFERENCES public.booking_requests(id),
  contract_id UUID,
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT hosts_contact_check CHECK (
    contact_email IS NOT NULL OR contact_phone IS NOT NULL
  )
);

-- Create indexes for better performance
CREATE INDEX idx_hosts_organization_name ON public.hosts(organization_name);
CREATE INDEX idx_hosts_city_state ON public.hosts(city, state);
CREATE INDEX idx_hosts_status ON public.hosts(status);
CREATE INDEX idx_hosts_source ON public.hosts(source);
CREATE INDEX idx_hosts_contact_email ON public.hosts(contact_email);
CREATE INDEX idx_hosts_last_contact_date ON public.hosts(last_contact_date);
CREATE INDEX idx_hosts_priority_level ON public.hosts(priority_level);

-- Create table for host interaction history
CREATE TABLE public.host_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  
  interaction_type TEXT NOT NULL, -- call, email, meeting, performance, contract_signed, etc.
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subject TEXT,
  description TEXT,
  outcome TEXT, -- positive, negative, neutral, follow_up_needed
  next_follow_up_date DATE,
  
  -- File attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_host_interactions_host_id ON public.host_interactions(host_id);
CREATE INDEX idx_host_interactions_date ON public.host_interactions(interaction_date);
CREATE INDEX idx_host_interactions_type ON public.host_interactions(interaction_type);

-- Create table for host performance history
CREATE TABLE public.host_performances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  
  performance_date DATE NOT NULL,
  event_title TEXT,
  venue_name TEXT,
  audience_size INTEGER,
  revenue DECIMAL(10,2),
  expenses DECIMAL(10,2),
  net_income DECIMAL(10,2),
  
  -- Performance details
  repertoire TEXT[],
  special_requirements TEXT,
  technical_notes TEXT,
  
  -- Feedback
  host_feedback TEXT,
  performer_feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- References
  contract_id UUID,
  event_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_host_performances_host_id ON public.host_performances(host_id);
CREATE INDEX idx_host_performances_date ON public.host_performances(performance_date);

-- Enable RLS on all tables
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_performances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hosts table
CREATE POLICY "Admins and tour managers can manage all hosts"
ON public.hosts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid()
    AND position IN ('tour_manager', 'road_manager', 'secretary')
    AND is_active = true
  )
);

CREATE POLICY "Executive board can view hosts"
ON public.hosts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND is_exec_board = true
  )
);

-- RLS Policies for host_interactions table
CREATE POLICY "Authorized users can manage host interactions"
ON public.host_interactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- RLS Policies for host_performances table
CREATE POLICY "Authorized users can manage host performances"
ON public.host_performances
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hosts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_hosts_updated_at
  BEFORE UPDATE ON public.hosts
  FOR EACH ROW
  EXECUTE FUNCTION update_hosts_updated_at();

CREATE TRIGGER update_host_performances_updated_at
  BEFORE UPDATE ON public.host_performances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create host from booking request
CREATE OR REPLACE FUNCTION create_host_from_booking_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create host if this is a new booking request and no host exists with this email
  IF NEW.status IN ('confirmed', 'approved') AND NOT EXISTS (
    SELECT 1 FROM public.hosts WHERE contact_email = NEW.contact_email
  ) THEN
    INSERT INTO public.hosts (
      contact_name,
      contact_email,
      contact_phone,
      organization_name,
      venue_name,
      street_address,
      city,
      event_location,
      preferred_event_types,
      budget_range_min,
      budget_range_max,
      typical_audience_size,
      first_contact_date,
      last_contact_date,
      source,
      status,
      booking_request_id,
      created_by,
      notes
    ) VALUES (
      NEW.contact_name,
      NEW.contact_email,
      NEW.contact_phone,
      NEW.organization_name,
      NEW.event_location,
      NEW.event_location,
      SPLIT_PART(NEW.event_location, ',', 1), -- Extract city from location
      NEW.event_location,
      ARRAY[NEW.event_type],
      CASE 
        WHEN NEW.budget_range LIKE '%-%' THEN 
          CAST(SPLIT_PART(NEW.budget_range, '-', 1) AS DECIMAL)
        ELSE NULL
      END,
      CASE 
        WHEN NEW.budget_range LIKE '%-%' THEN 
          CAST(SPLIT_PART(NEW.budget_range, '-', 2) AS DECIMAL)
        ELSE NULL
      END,
      NEW.estimated_audience,
      NEW.created_at::date,
      NEW.updated_at::date,
      'booking_request',
      'potential',
      NEW.id,
      NEW.assigned_to,
      NEW.special_requests
    );
    
    -- Create an interaction record
    INSERT INTO public.host_interactions (
      host_id,
      interaction_type,
      interaction_date,
      subject,
      description,
      outcome,
      created_by
    ) VALUES (
      (SELECT id FROM public.hosts WHERE booking_request_id = NEW.id),
      'booking_request',
      NEW.created_at::date,
      'Initial booking request: ' || NEW.event_type,
      NEW.event_description,
      'follow_up_needed',
      NEW.assigned_to
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking requests
CREATE TRIGGER create_host_from_booking_trigger
  AFTER UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_host_from_booking_request();

-- Helper function to search hosts
CREATE OR REPLACE FUNCTION search_hosts(
  search_term TEXT DEFAULT NULL,
  filter_status host_status DEFAULT NULL,
  filter_source host_source DEFAULT NULL,
  filter_state TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  contact_name TEXT,
  organization_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  city TEXT,
  state TEXT,
  status host_status,
  source host_source,
  last_contact_date DATE,
  total_performances INTEGER,
  priority_level INTEGER
)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT 
    h.id,
    h.contact_name,
    h.organization_name,
    h.contact_email,
    h.contact_phone,
    h.city,
    h.state,
    h.status,
    h.source,
    h.last_contact_date,
    h.total_performances,
    h.priority_level
  FROM public.hosts h
  WHERE 
    (search_term IS NULL OR 
     h.contact_name ILIKE '%' || search_term || '%' OR
     h.organization_name ILIKE '%' || search_term || '%' OR
     h.contact_email ILIKE '%' || search_term || '%' OR
     h.city ILIKE '%' || search_term || '%')
    AND (filter_status IS NULL OR h.status = filter_status)
    AND (filter_source IS NULL OR h.source = filter_source)
    AND (filter_state IS NULL OR h.state = filter_state)
  ORDER BY 
    h.priority_level ASC,
    h.last_contact_date DESC NULLS LAST,
    h.contact_name ASC
  LIMIT limit_count;
$$;