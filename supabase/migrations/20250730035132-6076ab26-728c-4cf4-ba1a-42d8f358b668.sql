-- Create press kits table
CREATE TABLE IF NOT EXISTS public.press_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  template_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create press kit items table
CREATE TABLE IF NOT EXISTS public.press_kit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  press_kit_id UUID REFERENCES public.press_kits(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('image', 'document', 'press_release', 'bio', 'fact_sheet', 'logo', 'video')),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_url TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create press kit shares table for tracking distributions
CREATE TABLE IF NOT EXISTS public.press_kit_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  press_kit_id UUID REFERENCES public.press_kits(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  access_token TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.press_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_kit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_kit_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for press_kits
CREATE POLICY "Admins and PR coordinators can manage press kits"
ON public.press_kits FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "Public press kits are viewable by all"
ON public.press_kits FOR SELECT
USING (is_public = true);

-- RLS Policies for press_kit_items
CREATE POLICY "Admins and PR coordinators can manage press kit items"
ON public.press_kit_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "Press kit items viewable if press kit is public"
ON public.press_kit_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.press_kits pk 
    WHERE pk.id = press_kit_items.press_kit_id AND pk.is_public = true
  )
);

-- RLS Policies for press_kit_shares
CREATE POLICY "Admins and PR coordinators can manage press kit shares"
ON public.press_kit_shares FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_press_kits_created_by ON public.press_kits(created_by);
CREATE INDEX IF NOT EXISTS idx_press_kits_status ON public.press_kits(status);
CREATE INDEX IF NOT EXISTS idx_press_kit_items_press_kit_id ON public.press_kit_items(press_kit_id);
CREATE INDEX IF NOT EXISTS idx_press_kit_items_type ON public.press_kit_items(item_type);
CREATE INDEX IF NOT EXISTS idx_press_kit_shares_press_kit_id ON public.press_kit_shares(press_kit_id);
CREATE INDEX IF NOT EXISTS idx_press_kit_shares_token ON public.press_kit_shares(access_token);

-- Create triggers for updating updated_at
CREATE OR REPLACE FUNCTION public.update_press_kits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_press_kit_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_press_kits_updated_at
  BEFORE UPDATE ON public.press_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_press_kits_updated_at();

CREATE TRIGGER update_press_kit_items_updated_at
  BEFORE UPDATE ON public.press_kit_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_press_kit_items_updated_at();