-- Add new executive positions for student conductor and section leaders
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'student_conductor';
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'section_leader_s1';
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'section_leader_s2';
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'section_leader_a1';
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'section_leader_a2';

-- Create unified communications tracking table
CREATE TABLE public.gw_communications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    channels TEXT[] NOT NULL DEFAULT '{}',
    total_recipients INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    scheduled_for TIMESTAMP WITH TIME ZONE NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    template_id UUID NULL,
    delivery_summary JSONB NULL DEFAULT '{}'::jsonb
);

-- Create delivery tracking table
CREATE TABLE public.gw_communication_deliveries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    communication_id UUID NOT NULL REFERENCES public.gw_communications(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    external_id TEXT NULL,
    error_message TEXT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    opened_at TIMESTAMP WITH TIME ZONE NULL,
    clicked_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message templates table
CREATE TABLE public.gw_message_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    variables TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_communication_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for gw_communications
CREATE POLICY "Admins and exec board can manage communications" 
ON public.gw_communications 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- RLS policies for gw_communication_deliveries
CREATE POLICY "Admins and exec board can view deliveries" 
ON public.gw_communication_deliveries 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Recipients can view their own deliveries" 
ON public.gw_communication_deliveries 
FOR SELECT 
USING (recipient_id = auth.uid());

-- RLS policies for gw_message_templates
CREATE POLICY "Admins and exec board can manage templates" 
ON public.gw_message_templates 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_gw_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_communications_updated_at
    BEFORE UPDATE ON public.gw_communications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gw_communications_updated_at();

CREATE OR REPLACE FUNCTION public.update_gw_communication_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_communication_deliveries_updated_at
    BEFORE UPDATE ON public.gw_communication_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gw_communication_deliveries_updated_at();

CREATE OR REPLACE FUNCTION public.update_gw_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_message_templates_updated_at
    BEFORE UPDATE ON public.gw_message_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gw_message_templates_updated_at();

-- Add indexes for performance
CREATE INDEX idx_gw_communications_sender_id ON public.gw_communications(sender_id);
CREATE INDEX idx_gw_communications_status ON public.gw_communications(status);
CREATE INDEX idx_gw_communications_scheduled_for ON public.gw_communications(scheduled_for);
CREATE INDEX idx_gw_communication_deliveries_communication_id ON public.gw_communication_deliveries(communication_id);
CREATE INDEX idx_gw_communication_deliveries_recipient_id ON public.gw_communication_deliveries(recipient_id);
CREATE INDEX idx_gw_communication_deliveries_status ON public.gw_communication_deliveries(status);
CREATE INDEX idx_gw_message_templates_category ON public.gw_message_templates(category);
CREATE INDEX idx_gw_message_templates_is_active ON public.gw_message_templates(is_active);