-- Add phone number column to gw_profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'gw_profiles' 
                   AND column_name = 'phone_number' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.gw_profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

-- Create notification delivery log table for appointment notifications
CREATE TABLE IF NOT EXISTS public.gw_notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id TEXT NOT NULL,
    user_id UUID,
    delivery_method TEXT NOT NULL DEFAULT 'sms',
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    external_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notification delivery log
ALTER TABLE public.gw_notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Create policies for notification delivery log
CREATE POLICY "Admins can manage notification delivery logs"
ON public.gw_notification_delivery_log
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    )
);

CREATE POLICY "Users can view their own notification logs"
ON public.gw_notification_delivery_log
FOR SELECT
USING (user_id = auth.uid());

-- Create function to send appointment notifications
CREATE OR REPLACE FUNCTION public.send_appointment_notification(
    p_appointment_id UUID,
    p_phone_number TEXT,
    p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Log the notification attempt
    INSERT INTO public.gw_notification_delivery_log (
        notification_id,
        delivery_method,
        status,
        metadata
    ) VALUES (
        p_appointment_id::text,
        'sms',
        'attempted',
        jsonb_build_object(
            'phone_number', p_phone_number,
            'message', p_message
        )
    );
    
    -- Return success (actual SMS sending would be handled by edge function)
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Notification logged successfully'
    );
END;
$$;