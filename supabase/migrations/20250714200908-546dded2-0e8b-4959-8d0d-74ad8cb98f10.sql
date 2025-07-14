-- Create notifications table for internal app notifications
CREATE TABLE public.gw_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error, announcement
  category TEXT DEFAULT 'general', -- general, event, contract, attendance, financial
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT, -- Optional URL for action button
  action_label TEXT, -- Label for action button
  metadata JSONB DEFAULT '{}', -- Additional data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  priority INTEGER NOT NULL DEFAULT 0 -- 0=low, 1=normal, 2=high, 3=urgent
);

-- Create notification preferences table
CREATE TABLE public.gw_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  announcement_email BOOLEAN NOT NULL DEFAULT true,
  announcement_sms BOOLEAN NOT NULL DEFAULT false,
  event_reminders BOOLEAN NOT NULL DEFAULT true,
  contract_updates BOOLEAN NOT NULL DEFAULT true,
  attendance_alerts BOOLEAN NOT NULL DEFAULT true,
  financial_updates BOOLEAN NOT NULL DEFAULT false,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification delivery log table
CREATE TABLE public.gw_notification_delivery_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.gw_notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_method TEXT NOT NULL, -- 'internal', 'email', 'sms', 'push'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
  external_id TEXT, -- ID from external service (email service, SMS service)
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social media posts table
CREATE TABLE public.gw_social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES public.gw_announcements(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'twitter', 'facebook', 'instagram', 'linkedin'
  content TEXT NOT NULL,
  media_urls TEXT[], -- Array of media URLs
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  external_post_id TEXT, -- ID from social platform
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, posted, failed
  error_message TEXT,
  engagement_metrics JSONB DEFAULT '{}', -- likes, shares, comments, etc.
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.gw_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.gw_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" 
ON public.gw_notifications 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "System can create notifications" 
ON public.gw_notifications 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for notification preferences
CREATE POLICY "Users can manage their own preferences" 
ON public.gw_notification_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for delivery log
CREATE POLICY "Users can view their own delivery logs" 
ON public.gw_notification_delivery_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage delivery logs" 
ON public.gw_notification_delivery_log 
FOR ALL 
USING (true);

-- RLS Policies for social media posts
CREATE POLICY "Admins can manage social media posts" 
ON public.gw_social_media_posts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Public can view published social media posts" 
ON public.gw_social_media_posts 
FOR SELECT 
USING (status = 'posted');

-- Create indexes for performance
CREATE INDEX idx_gw_notifications_user_id ON public.gw_notifications(user_id);
CREATE INDEX idx_gw_notifications_created_at ON public.gw_notifications(created_at DESC);
CREATE INDEX idx_gw_notifications_is_read ON public.gw_notifications(is_read);
CREATE INDEX idx_gw_notifications_type ON public.gw_notifications(type);
CREATE INDEX idx_gw_notifications_expires_at ON public.gw_notifications(expires_at);

CREATE INDEX idx_gw_notification_delivery_log_notification_id ON public.gw_notification_delivery_log(notification_id);
CREATE INDEX idx_gw_notification_delivery_log_user_id ON public.gw_notification_delivery_log(user_id);
CREATE INDEX idx_gw_notification_delivery_log_status ON public.gw_notification_delivery_log(status);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_notifications()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_notifications_updated_at
  BEFORE UPDATE ON public.gw_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_notifications();

CREATE TRIGGER update_gw_notification_preferences_updated_at
  BEFORE UPDATE ON public.gw_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_notifications();

CREATE TRIGGER update_gw_social_media_posts_updated_at
  BEFORE UPDATE ON public.gw_social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_notifications();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_notifications;
ALTER TABLE public.gw_notifications REPLICA IDENTITY FULL;

-- Function to create notification with delivery
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
  p_send_email BOOLEAN DEFAULT false,
  p_send_sms BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert notification
  INSERT INTO public.gw_notifications (
    user_id, title, message, type, category, action_url, 
    action_label, metadata, priority, expires_at
  )
  VALUES (
    p_user_id, p_title, p_message, p_type, p_category, p_action_url,
    p_action_label, p_metadata, p_priority, p_expires_at
  )
  RETURNING id INTO notification_id;
  
  -- Log internal delivery
  INSERT INTO public.gw_notification_delivery_log (
    notification_id, user_id, delivery_method, status, sent_at
  )
  VALUES (
    notification_id, p_user_id, 'internal', 'delivered', now()
  );
  
  -- Log email delivery if requested
  IF p_send_email THEN
    INSERT INTO public.gw_notification_delivery_log (
      notification_id, user_id, delivery_method, status
    )
    VALUES (
      notification_id, p_user_id, 'email', 'pending'
    );
  END IF;
  
  -- Log SMS delivery if requested
  IF p_send_sms THEN
    INSERT INTO public.gw_notification_delivery_log (
      notification_id, user_id, delivery_method, status
    )
    VALUES (
      notification_id, p_user_id, 'sms', 'pending'
    );
  END IF;
  
  RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gw_notifications 
  SET is_read = true, updated_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.gw_notifications 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;