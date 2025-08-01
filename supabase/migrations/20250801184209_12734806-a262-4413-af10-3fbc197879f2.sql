-- Create wardrobe checkout tracking table
CREATE TABLE public.wardrobe_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wardrobe_item_id UUID NOT NULL REFERENCES public.wardrobe_items(id) ON DELETE CASCADE,
  checked_out_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_out_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  size_selected TEXT,
  color_selected TEXT,
  quantity_checked_out INTEGER NOT NULL DEFAULT 1,
  checkout_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_return_date DATE,
  actual_return_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'checked_out' CHECK (status IN ('checked_out', 'returned', 'overdue', 'lost')),
  checkout_notes TEXT,
  return_notes TEXT,
  confirmation_token TEXT,
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wardrobe checkout history table for audit trail
CREATE TABLE public.wardrobe_checkout_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_id UUID NOT NULL REFERENCES public.wardrobe_checkouts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('checkout', 'email_sent', 'email_confirmed', 'return', 'overdue_notice')),
  performed_by UUID REFERENCES auth.users(id),
  action_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.wardrobe_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wardrobe_checkout_history ENABLE ROW LEVEL SECURITY;

-- Create policies for wardrobe_checkouts
CREATE POLICY "Admins can manage all checkouts" 
ON public.wardrobe_checkouts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Executive board members can manage checkouts" 
ON public.wardrobe_checkouts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_executive_board_members 
  WHERE user_id = auth.uid() 
  AND is_active = true
));

CREATE POLICY "Users can view their own checkouts" 
ON public.wardrobe_checkouts 
FOR SELECT 
USING (checked_out_to = auth.uid());

-- Create policies for wardrobe_checkout_history
CREATE POLICY "Admins can view all checkout history" 
ON public.wardrobe_checkout_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Executive board members can view checkout history" 
ON public.wardrobe_checkout_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.gw_executive_board_members 
  WHERE user_id = auth.uid() 
  AND is_active = true
));

CREATE POLICY "Allow inserting checkout history" 
ON public.wardrobe_checkout_history 
FOR INSERT 
WITH CHECK (true);

-- Create function to update checkout quantities
CREATE OR REPLACE FUNCTION public.update_wardrobe_checkout_quantities()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Decrease available quantity when checking out
    UPDATE public.wardrobe_items 
    SET available_quantity = available_quantity - NEW.quantity_checked_out
    WHERE id = NEW.wardrobe_item_id;
    
    -- Log the checkout action
    INSERT INTO public.wardrobe_checkout_history (
      checkout_id, action_type, performed_by, details
    ) VALUES (
      NEW.id, 'checkout', NEW.checked_out_by, 
      jsonb_build_object(
        'item_id', NEW.wardrobe_item_id,
        'quantity', NEW.quantity_checked_out,
        'checked_out_to', NEW.checked_out_to
      )
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle return
    IF OLD.status != 'returned' AND NEW.status = 'returned' THEN
      -- Increase available quantity when returning
      UPDATE public.wardrobe_items 
      SET available_quantity = available_quantity + NEW.quantity_checked_out
      WHERE id = NEW.wardrobe_item_id;
      
      -- Log the return action
      INSERT INTO public.wardrobe_checkout_history (
        checkout_id, action_type, performed_by, details
      ) VALUES (
        NEW.id, 'return', auth.uid(), 
        jsonb_build_object(
          'item_id', NEW.wardrobe_item_id,
          'quantity', NEW.quantity_checked_out,
          'return_notes', NEW.return_notes
        )
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER wardrobe_checkout_quantity_trigger
  AFTER INSERT OR UPDATE ON public.wardrobe_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_wardrobe_checkout_quantities();

-- Create trigger for updated_at
CREATE TRIGGER update_wardrobe_checkouts_updated_at
  BEFORE UPDATE ON public.wardrobe_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate confirmation tokens
CREATE OR REPLACE FUNCTION public.generate_checkout_confirmation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;