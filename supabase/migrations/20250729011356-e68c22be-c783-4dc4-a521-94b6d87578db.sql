-- Create booking requests table for external performance requests
CREATE TABLE public.gw_booking_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Contact Information
    organization_name TEXT NOT NULL,
    contact_person_name TEXT NOT NULL,
    contact_title TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    website TEXT,
    
    -- Event Details
    event_name TEXT NOT NULL,
    event_description TEXT,
    event_date_start DATE NOT NULL,
    event_date_end DATE,
    performance_time TIME,
    performance_duration TEXT NOT NULL CHECK (performance_duration IN ('15-30 min', '30-60 min', 'Full concert')),
    venue_name TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    venue_type TEXT NOT NULL CHECK (venue_type IN ('Auditorium', 'Church', 'Stadium', 'Outdoor', 'Other')),
    expected_attendance INTEGER,
    theme_occasion TEXT,
    
    -- Technical & Logistical Info
    stage_dimensions TEXT,
    sound_system_available BOOLEAN DEFAULT false,
    sound_system_description TEXT,
    lighting_available BOOLEAN DEFAULT false,
    lighting_description TEXT,
    piano_available BOOLEAN DEFAULT false,
    piano_type TEXT CHECK (piano_type IN ('Acoustic Grand', 'Digital', 'Upright')),
    dressing_rooms_available BOOLEAN DEFAULT false,
    rehearsal_time_provided TIMESTAMP WITH TIME ZONE,
    load_in_soundcheck_time TEXT,
    av_capabilities TEXT,
    
    -- Hospitality & Travel
    honorarium_offered BOOLEAN DEFAULT false,
    honorarium_amount NUMERIC(10,2),
    travel_expenses_covered TEXT[], -- Array for multiple selections
    lodging_provided BOOLEAN DEFAULT false,
    lodging_nights INTEGER,
    meals_provided BOOLEAN DEFAULT false,
    dietary_restrictions TEXT,
    preferred_arrival_point TEXT,
    
    -- Permissions & Media
    event_recorded_livestreamed BOOLEAN DEFAULT false,
    recording_description TEXT,
    photo_video_permission BOOLEAN DEFAULT false,
    promotional_assets_requested TEXT[], -- Array for multiple selections
    formal_contract_required BOOLEAN DEFAULT false,
    
    -- Additional
    notes_for_director TEXT,
    notes_for_choir TEXT,
    how_heard_about_us TEXT,
    
    -- Status and Management
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'declined')),
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_booking_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can submit booking requests" 
ON public.gw_booking_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins and Tour Managers can view all booking requests" 
ON public.gw_booking_requests 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() 
        AND position = 'tour_manager' 
        AND is_active = true
    )
);

CREATE POLICY "Admins and Tour Managers can update booking requests" 
ON public.gw_booking_requests 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() 
        AND position = 'tour_manager' 
        AND is_active = true
    )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_gw_booking_requests_updated_at
    BEFORE UPDATE ON public.gw_booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_gw_booking_requests_status ON public.gw_booking_requests(status);
CREATE INDEX idx_gw_booking_requests_event_date ON public.gw_booking_requests(event_date_start);
CREATE INDEX idx_gw_booking_requests_created_at ON public.gw_booking_requests(created_at);