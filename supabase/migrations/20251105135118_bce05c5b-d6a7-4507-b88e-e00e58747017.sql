-- Create dashboard_card_order table for super admins to customize card layout
CREATE TABLE IF NOT EXISTS public.gw_dashboard_card_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_order TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.gw_dashboard_card_order ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage their own card order
CREATE POLICY "Super admins can manage own card order"
ON public.gw_dashboard_card_order
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.is_super_admin = true
  )
)
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.is_super_admin = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_card_order_updated_at
  BEFORE UPDATE ON public.gw_dashboard_card_order
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();