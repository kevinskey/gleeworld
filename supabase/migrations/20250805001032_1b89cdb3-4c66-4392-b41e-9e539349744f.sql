-- Create wardrobe management tables

-- Wardrobe inventory items table
CREATE TABLE public.gw_wardrobe_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL, -- 'dress', 'pearls', 'lipstick', 'polo', 't-shirt', 'garment-bag'
  item_name TEXT NOT NULL,
  size_category TEXT, -- 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'N/A'
  color TEXT,
  brand TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  condition TEXT NOT NULL DEFAULT 'new', -- 'new', 'good', 'fair', 'poor', 'damaged'
  location TEXT, -- where item is stored
  barcode TEXT UNIQUE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Wardrobe check in/out tracking
CREATE TABLE public.gw_wardrobe_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.gw_wardrobe_inventory(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  checked_out_by UUID NOT NULL REFERENCES auth.users(id), -- staff member who processed checkout
  checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_return_date DATE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES auth.users(id), -- staff member who processed checkin
  condition_at_checkout TEXT DEFAULT 'good',
  condition_at_checkin TEXT,
  damage_notes TEXT,
  replacement_fee DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'checked_out', -- 'checked_out', 'returned', 'overdue', 'lost', 'damaged'
  purpose TEXT, -- 'rehearsal', 'performance', 'tour', 'photoshoot', etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wardrobe dress code media/rules
CREATE TABLE public.gw_wardrobe_dress_code_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL, -- 'image', 'video', 'document', 'link'
  media_url TEXT NOT NULL,
  category TEXT NOT NULL, -- 'formal', 'rehearsal', 'casual', 'tour', 'general'
  target_audience TEXT DEFAULT 'all', -- 'new_members', 'all', 'executive_board'
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Makeup tutorials and educational content
CREATE TABLE public.gw_makeup_tutorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- HTML content for the tutorial
  featured_image_url TEXT,
  video_url TEXT,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  estimated_time_minutes INTEGER,
  products_needed TEXT[], -- array of makeup products needed
  step_by_step_instructions JSONB, -- structured tutorial steps
  category TEXT DEFAULT 'general', -- 'stage', 'everyday', 'special_event', 'general'
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Garment bag distribution for tours
CREATE TABLE public.gw_garment_bag_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_event_id UUID, -- can reference an event/tour
  bag_number TEXT NOT NULL,
  assigned_to_user_id UUID REFERENCES auth.users(id),
  contents JSONB, -- array of items in the bag
  distributed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  distributed_by UUID NOT NULL REFERENCES auth.users(id),
  returned_at TIMESTAMP WITH TIME ZONE,
  returned_by UUID REFERENCES auth.users(id),
  condition_notes TEXT,
  status TEXT NOT NULL DEFAULT 'distributed', -- 'distributed', 'returned', 'missing', 'damaged'
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wardrobe notifications
CREATE TABLE public.gw_wardrobe_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL, -- 'overdue_return', 'damage_reported', 'inventory_low', 'checkout_reminder'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id), -- specific user or null for general notifications
  related_checkout_id UUID REFERENCES public.gw_wardrobe_checkouts(id),
  related_inventory_id UUID REFERENCES public.gw_wardrobe_inventory(id),
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.gw_wardrobe_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wardrobe_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wardrobe_dress_code_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_makeup_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_garment_bag_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wardrobe_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Wardrobe inventory policies
CREATE POLICY "Admins and wardrobe staff can manage inventory" ON public.gw_wardrobe_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text IN ('wardrobe_mistress', 'assistant_wardrobe_mistress')
      AND is_active = true
    )
  );

CREATE POLICY "Members can view active inventory" ON public.gw_wardrobe_inventory
  FOR SELECT USING (is_active = true);

-- Wardrobe checkout policies
CREATE POLICY "Admins and wardrobe staff can manage checkouts" ON public.gw_wardrobe_checkouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text IN ('wardrobe_mistress', 'assistant_wardrobe_mistress')
      AND is_active = true
    )
  );

CREATE POLICY "Users can view their own checkouts" ON public.gw_wardrobe_checkouts
  FOR SELECT USING (user_id = auth.uid());

-- Dress code media policies
CREATE POLICY "Admins and wardrobe staff can manage dress code media" ON public.gw_wardrobe_dress_code_media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text IN ('wardrobe_mistress', 'assistant_wardrobe_mistress')
      AND is_active = true
    )
  );

CREATE POLICY "Members can view active dress code media" ON public.gw_wardrobe_dress_code_media
  FOR SELECT USING (is_active = true);

-- Makeup tutorials policies
CREATE POLICY "Admins and wardrobe staff can manage makeup tutorials" ON public.gw_makeup_tutorials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text IN ('wardrobe_mistress', 'assistant_wardrobe_mistress')
      AND is_active = true
    )
  );

CREATE POLICY "Members can view published tutorials" ON public.gw_makeup_tutorials
  FOR SELECT USING (is_published = true);

-- Garment bag distribution policies
CREATE POLICY "Admins and wardrobe staff can manage garment bags" ON public.gw_garment_bag_distributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text IN ('wardrobe_mistress', 'assistant_wardrobe_mistress', 'tour_manager')
      AND is_active = true
    )
  );

CREATE POLICY "Users can view their own garment bag assignments" ON public.gw_garment_bag_distributions
  FOR SELECT USING (assigned_to_user_id = auth.uid());

-- Wardrobe notifications policies
CREATE POLICY "Admins and wardrobe staff can manage notifications" ON public.gw_wardrobe_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text IN ('wardrobe_mistress', 'assistant_wardrobe_mistress')
      AND is_active = true
    )
  );

CREATE POLICY "Users can view their own notifications" ON public.gw_wardrobe_notifications
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Create update triggers
CREATE OR REPLACE FUNCTION public.update_wardrobe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wardrobe_inventory_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_wardrobe_updated_at();

CREATE TRIGGER update_wardrobe_checkouts_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_wardrobe_updated_at();

CREATE TRIGGER update_dress_code_media_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_dress_code_media
  FOR EACH ROW EXECUTE FUNCTION public.update_wardrobe_updated_at();

CREATE TRIGGER update_makeup_tutorials_updated_at
  BEFORE UPDATE ON public.gw_makeup_tutorials
  FOR EACH ROW EXECUTE FUNCTION public.update_wardrobe_updated_at();

CREATE TRIGGER update_garment_bag_distributions_updated_at
  BEFORE UPDATE ON public.gw_garment_bag_distributions
  FOR EACH ROW EXECUTE FUNCTION public.update_wardrobe_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_wardrobe_inventory_type ON public.gw_wardrobe_inventory(item_type);
CREATE INDEX idx_wardrobe_inventory_active ON public.gw_wardrobe_inventory(is_active);
CREATE INDEX idx_wardrobe_checkouts_user ON public.gw_wardrobe_checkouts(user_id);
CREATE INDEX idx_wardrobe_checkouts_status ON public.gw_wardrobe_checkouts(status);
CREATE INDEX idx_wardrobe_checkouts_expected_return ON public.gw_wardrobe_checkouts(expected_return_date);
CREATE INDEX idx_dress_code_media_category ON public.gw_wardrobe_dress_code_media(category);
CREATE INDEX idx_makeup_tutorials_published ON public.gw_makeup_tutorials(is_published);
CREATE INDEX idx_garment_bag_status ON public.gw_garment_bag_distributions(status);
CREATE INDEX idx_wardrobe_notifications_user ON public.gw_wardrobe_notifications(user_id);
CREATE INDEX idx_wardrobe_notifications_read ON public.gw_wardrobe_notifications(is_read);