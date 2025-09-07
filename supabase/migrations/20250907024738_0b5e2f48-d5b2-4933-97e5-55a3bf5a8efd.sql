-- Add payment-related columns to gw_appointments table
ALTER TABLE public.gw_appointments 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_amount INTEGER, -- Amount in cents
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_gw_appointments_stripe_session ON public.gw_appointments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_gw_appointments_payment_status ON public.gw_appointments(payment_status);

-- Update existing appointments to have default values
UPDATE public.gw_appointments 
SET payment_status = 'free', duration_minutes = 30 
WHERE payment_status IS NULL;