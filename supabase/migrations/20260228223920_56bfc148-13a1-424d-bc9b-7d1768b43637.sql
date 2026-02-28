
-- Coupon codes table for free cart and other promotions
CREATE TABLE public.gw_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 100,
  max_uses INTEGER DEFAULT 1,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  description TEXT,
  batch_id TEXT
);

-- Enable RLS
ALTER TABLE public.gw_coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons" ON public.gw_coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true)
  );

-- Anyone can read active coupons (to validate at checkout)
CREATE POLICY "Anyone can read active coupons" ON public.gw_coupons
  FOR SELECT USING (is_active = true);

-- Coupon usage log
CREATE TABLE public.gw_coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.gw_coupons(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_by UUID REFERENCES auth.users(id),
  order_total NUMERIC,
  channel TEXT CHECK (channel IN ('pos', 'online'))
);

ALTER TABLE public.gw_coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupon usage" ON public.gw_coupon_usage
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true)
  );

CREATE POLICY "Users can insert usage" ON public.gw_coupon_usage
  FOR INSERT WITH CHECK (true);

-- Function to generate a batch of unique coupon codes
CREATE OR REPLACE FUNCTION public.generate_coupon_batch(
  p_count INTEGER,
  p_prefix TEXT DEFAULT 'GLEE',
  p_discount_type TEXT DEFAULT 'percent',
  p_discount_value NUMERIC DEFAULT 100,
  p_max_uses INTEGER DEFAULT 1,
  p_description TEXT DEFAULT 'Free cart coupon',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(code TEXT, id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
  new_code TEXT;
  new_id UUID;
  batch TEXT;
BEGIN
  batch := p_prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4);
  
  FOR i IN 1..p_count LOOP
    -- Generate unique 8-char alphanumeric code
    new_code := p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    new_id := gen_random_uuid();
    
    INSERT INTO public.gw_coupons (id, code, discount_type, discount_value, max_uses, description, expires_at, created_by, batch_id)
    VALUES (new_id, new_code, p_discount_type, p_discount_value, p_max_uses, p_description, p_expires_at, auth.uid(), batch);
    
    code := new_code;
    id := new_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Function to validate and redeem a coupon
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_code TEXT,
  p_order_total NUMERIC DEFAULT 0,
  p_channel TEXT DEFAULT 'online'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_coupon FROM public.gw_coupons
  WHERE code = upper(trim(p_code)) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;
  
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;
  
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon has been fully used');
  END IF;
  
  -- Record usage
  INSERT INTO public.gw_coupon_usage (coupon_id, used_by, order_total, channel)
  VALUES (v_coupon.id, auth.uid(), p_order_total, p_channel);
  
  -- Increment usage count
  UPDATE public.gw_coupons SET times_used = times_used + 1 WHERE id = v_coupon.id;
  
  -- Deactivate if max uses reached
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used + 1 >= v_coupon.max_uses THEN
    UPDATE public.gw_coupons SET is_active = false WHERE id = v_coupon.id;
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'description', v_coupon.description
  );
END;
$$;

-- Function to validate a coupon without redeeming
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  SELECT * INTO v_coupon FROM public.gw_coupons
  WHERE code = upper(trim(p_code)) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;
  
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;
  
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon has been fully used');
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'description', v_coupon.description
  );
END;
$$;
