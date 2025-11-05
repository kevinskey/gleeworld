-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Create function to clean up old subscriptions
CREATE OR REPLACE FUNCTION public.cleanup_old_push_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE user_id = NEW.user_id
    AND endpoint = NEW.endpoint
    AND id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one subscription per endpoint per user
CREATE TRIGGER cleanup_duplicate_subscriptions
  AFTER INSERT ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_push_subscriptions();