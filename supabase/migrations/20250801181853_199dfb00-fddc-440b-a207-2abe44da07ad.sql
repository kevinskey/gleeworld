-- Create wardrobe items table
CREATE TABLE public.wardrobe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  size_options TEXT[] DEFAULT '{}',
  color_options TEXT[] DEFAULT '{}',
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wardrobe checkouts table
CREATE TABLE public.wardrobe_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.wardrobe_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  color TEXT,
  checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  notes TEXT,
  checked_out_by UUID, -- wardrobe mistress who processed checkout
  checked_in_by UUID,  -- wardrobe mistress who processed check-in
  status TEXT NOT NULL DEFAULT 'checked_out' CHECK (status IN ('checked_out', 'checked_in', 'overdue', 'lost'))
);

-- Enable RLS
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wardrobe_checkouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wardrobe_items
CREATE POLICY "Everyone can view wardrobe items" 
ON public.wardrobe_items 
FOR SELECT 
USING (true);

CREATE POLICY "Wardrobe managers can manage items" 
ON public.wardrobe_items 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'wardrobe_manager' 
    AND is_active = true
  )
);

-- RLS Policies for wardrobe_checkouts
CREATE POLICY "Users can view their own checkouts" 
ON public.wardrobe_checkouts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Wardrobe managers can view all checkouts" 
ON public.wardrobe_checkouts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'wardrobe_manager' 
    AND is_active = true
  )
);

CREATE POLICY "Wardrobe managers can manage checkouts" 
ON public.wardrobe_checkouts 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'wardrobe_manager' 
    AND is_active = true
  )
);

-- Insert sample wardrobe items
INSERT INTO public.wardrobe_items (name, category, size_options, color_options, total_quantity, available_quantity) VALUES
('Formal Black Dress', 'formal', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black'], 25, 25),
('Pearl Necklace', 'accessories', ARRAY['One Size'], ARRAY['White'], 30, 30),
('Red Lipstick - MAC Ruby Woo', 'cosmetics', ARRAY['One Size'], ARRAY['Red'], 15, 15),
('Black Polo Shirt', 'casual', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black'], 40, 40),
('Performance T-Shirt', 'performance', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Navy', 'Maroon'], 50, 50);

-- Create function to update item quantities when checkout status changes
CREATE OR REPLACE FUNCTION update_wardrobe_item_quantities()
RETURNS TRIGGER AS $$
BEGIN
  -- Update available quantity based on checkout status changes
  IF TG_OP = 'INSERT' THEN
    -- Item checked out, decrease available quantity
    UPDATE wardrobe_items 
    SET available_quantity = available_quantity - NEW.quantity
    WHERE id = NEW.item_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed
    IF OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
      -- Item checked in, increase available quantity
      UPDATE wardrobe_items 
      SET available_quantity = available_quantity + NEW.quantity
      WHERE id = NEW.item_id;
    ELSIF OLD.status = 'checked_in' AND NEW.status = 'checked_out' THEN
      -- Item checked out again, decrease available quantity
      UPDATE wardrobe_items 
      SET available_quantity = available_quantity - NEW.quantity
      WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Checkout record deleted, increase available quantity if it was checked out
    IF OLD.status = 'checked_out' THEN
      UPDATE wardrobe_items 
      SET available_quantity = available_quantity + OLD.quantity
      WHERE id = OLD.item_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER wardrobe_quantity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON wardrobe_checkouts
  FOR EACH ROW EXECUTE FUNCTION update_wardrobe_item_quantities();