-- Create the missing create_notification_with_delivery function
CREATE OR REPLACE FUNCTION public.create_notification_with_delivery(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_category TEXT DEFAULT 'general',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_priority INTEGER DEFAULT 0,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_send_email BOOLEAN DEFAULT FALSE,
  p_send_sms BOOLEAN DEFAULT FALSE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert the notification
  INSERT INTO public.gw_notifications (
    user_id, title, message, type, category, action_url, action_label,
    metadata, priority, expires_at, is_read
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_category, p_action_url, p_action_label,
    p_metadata, p_priority, p_expires_at, FALSE
  ) RETURNING id INTO notification_id;
  
  -- Create delivery logs for requested channels
  IF p_send_email THEN
    INSERT INTO public.gw_notification_delivery_log (
      notification_id, delivery_method, status
    ) VALUES (
      notification_id, 'email', 'pending'
    );
  END IF;
  
  IF p_send_sms THEN
    INSERT INTO public.gw_notification_delivery_log (
      notification_id, delivery_method, status
    ) VALUES (
      notification_id, 'sms', 'pending'
    );
  END IF;
  
  RETURN notification_id;
END;
$$;