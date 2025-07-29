-- Create wardrobe management tables

-- Wardrobe inventory table
CREATE TABLE public.gw_wardrobe_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('formal_dress', 'lipstick', 'pearls', 'semi_formal_polo', 'casual_tshirt')),
  item_name TEXT NOT NULL,
  size_available TEXT[],
  color_available TEXT[],
  quantity_total INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_checked_out INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'good', 'fair', 'needs_repair', 'retired')),
  low_stock_threshold INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Member wardrobe profiles
CREATE TABLE public.gw_member_wardrobe_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formal_dress_size TEXT,
  polo_size TEXT,
  tshirt_size TEXT,
  lipstick_shade TEXT,
  pearl_status TEXT DEFAULT 'unassigned' CHECK (pearl_status IN ('unassigned', 'assigned', 'lost', 'replaced')),
  
  -- Measurements
  bust_measurement DECIMAL(4,1),
  waist_measurement DECIMAL(4,1),
  hips_measurement DECIMAL(4,1),
  inseam_measurement DECIMAL(4,1),
  height_measurement DECIMAL(4,1),
  
  measurements_taken_date DATE,
  measurements_taken_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Wardrobe checkout system
CREATE TABLE public.gw_wardrobe_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.gw_wardrobe_inventory(id),
  member_id UUID NOT NULL REFERENCES auth.users(id),
  checked_out_by UUID NOT NULL REFERENCES auth.users(id),
  
  size TEXT NOT NULL,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date DATE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES auth.users(id),
  
  checkout_condition TEXT DEFAULT 'good' CHECK (checkout_condition IN ('new', 'good', 'fair', 'needs_repair')),
  return_condition TEXT CHECK (return_condition IN ('clean', 'stained', 'needs_repair', 'damaged', 'lost')),
  
  status TEXT NOT NULL DEFAULT 'checked_out' CHECK (status IN ('checked_out', 'returned', 'overdue', 'lost', 'damaged')),
  
  notes TEXT,
  receipt_generated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wardrobe orders
CREATE TABLE public.gw_wardrobe_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type TEXT NOT NULL CHECK (order_type IN ('formal_dress', 'lipstick', 'pearls', 'semi_formal_polo', 'casual_tshirt')),
  item_description TEXT NOT NULL,
  
  quantities JSONB, -- Store size/color quantities as JSON
  estimated_cost DECIMAL(10,2),
  budget_notes TEXT,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'shipped', 'delivered', 'received')),
  
  vendor_name TEXT,
  order_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  ordered_by UUID NOT NULL REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wardrobe announcements
CREATE TABLE public.gw_wardrobe_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  announcement_type TEXT DEFAULT 'general' CHECK (announcement_type IN ('general', 'return_reminder', 'new_inventory', 'maintenance')),
  
  target_audience TEXT DEFAULT 'all_members' CHECK (target_audience IN ('all_members', 'specific_checkout', 'voice_sections')),
  target_user_ids UUID[],
  voice_sections TEXT[],
  
  scheduled_send_date TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  is_urgent BOOLEAN DEFAULT false,
  auto_remind BOOLEAN DEFAULT false,
  
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wardrobe files (PDFs, images, etc.)
CREATE TABLE public.gw_wardrobe_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_category TEXT CHECK (file_category IN ('dress_code', 'faq', 'measurements', 'receipts', 'other')),
  
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_wardrobe_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_member_wardrobe_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wardrobe_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wardrobe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wardrobe_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_wardrobe_files ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE TRIGGER update_gw_wardrobe_inventory_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_member_wardrobe_profiles_updated_at
  BEFORE UPDATE ON public.gw_member_wardrobe_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_wardrobe_checkouts_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_wardrobe_orders_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_wardrobe_announcements_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_wardrobe_files_updated_at
  BEFORE UPDATE ON public.gw_wardrobe_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Wardrobe inventory policies
CREATE POLICY "Wardrobe managers and admins can manage inventory"
  ON public.gw_wardrobe_inventory
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'wardrobe_manager'::executive_position 
      AND is_active = true
    ) OR 
    is_current_user_admin_or_super_admin()
  );

CREATE POLICY "Members can view inventory"
  ON public.gw_wardrobe_inventory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Member wardrobe profiles policies
CREATE POLICY "Wardrobe managers and admins can manage member profiles"
  ON public.gw_member_wardrobe_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'wardrobe_manager'::executive_position 
      AND is_active = true
    ) OR 
    is_current_user_admin_or_super_admin()
  );

CREATE POLICY "Members can view their own wardrobe profile"
  ON public.gw_member_wardrobe_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Wardrobe checkouts policies
CREATE POLICY "Wardrobe managers and admins can manage checkouts"
  ON public.gw_wardrobe_checkouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'wardrobe_manager'::executive_position 
      AND is_active = true
    ) OR 
    is_current_user_admin_or_super_admin()
  );

CREATE POLICY "Members can view their own checkouts"
  ON public.gw_wardrobe_checkouts
  FOR SELECT
  USING (member_id = auth.uid());

-- Wardrobe orders policies
CREATE POLICY "Wardrobe managers and admins can manage orders"
  ON public.gw_wardrobe_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'wardrobe_manager'::executive_position 
      AND is_active = true
    ) OR 
    is_current_user_admin_or_super_admin()
  );

-- Wardrobe announcements policies
CREATE POLICY "Wardrobe managers and admins can manage announcements"
  ON public.gw_wardrobe_announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'wardrobe_manager'::executive_position 
      AND is_active = true
    ) OR 
    is_current_user_admin_or_super_admin()
  );

CREATE POLICY "Members can view announcements"
  ON public.gw_wardrobe_announcements
  FOR SELECT
  USING (
    target_audience = 'all_members' OR
    auth.uid() = ANY(target_user_ids) OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND voice_part = ANY(voice_sections)
    )
  );

-- Wardrobe files policies
CREATE POLICY "Wardrobe managers and admins can manage files"
  ON public.gw_wardrobe_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'wardrobe_manager'::executive_position 
      AND is_active = true
    ) OR 
    is_current_user_admin_or_super_admin()
  );

CREATE POLICY "Members can view wardrobe files"
  ON public.gw_wardrobe_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid()
    )
  );