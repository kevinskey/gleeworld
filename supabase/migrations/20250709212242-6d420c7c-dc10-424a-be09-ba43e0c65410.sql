-- Update gw_profiles table to match complete GleeWorld user data structure
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Glee Club Specific Fields
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS voice_part TEXT CHECK (voice_part IN ('soprano_1', 'soprano_2', 'alto_1', 'alto_2', 'tenor', 'bass'));
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS class_year INTEGER;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'alumni', 'on_leave'));
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS dues_paid BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- Administrative Fields
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS role_tags TEXT[];
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS special_roles TEXT[];

-- Executive Board Fields
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS is_exec_board BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS exec_board_role TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS music_role TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS org TEXT;

-- E-commerce Fields
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS ecommerce_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS account_balance DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS current_cart_id UUID;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS default_shipping_address JSONB;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS design_history_ids UUID[];

-- System Fields
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Update the updated_at timestamp
ALTER TABLE public.gw_profiles ALTER COLUMN updated_at SET DEFAULT now();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_gw_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gw_profiles_updated_at_trigger ON public.gw_profiles;
CREATE TRIGGER update_gw_profiles_updated_at_trigger
    BEFORE UPDATE ON public.gw_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_gw_profiles_updated_at();

-- Create function to sync full_name from first/last names
CREATE OR REPLACE FUNCTION sync_gw_profile_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name = COALESCE(NEW.first_name, '') || CASE 
      WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN ' ' 
      ELSE '' 
    END || COALESCE(NEW.last_name, '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_gw_profile_full_name_trigger ON public.gw_profiles;
CREATE TRIGGER sync_gw_profile_full_name_trigger
    BEFORE INSERT OR UPDATE ON public.gw_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_gw_profile_full_name();

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gw_profiles_voice_part ON public.gw_profiles(voice_part);
CREATE INDEX IF NOT EXISTS idx_gw_profiles_class_year ON public.gw_profiles(class_year);
CREATE INDEX IF NOT EXISTS idx_gw_profiles_status ON public.gw_profiles(status);
CREATE INDEX IF NOT EXISTS idx_gw_profiles_exec_board ON public.gw_profiles(is_exec_board) WHERE is_exec_board = true;
CREATE INDEX IF NOT EXISTS idx_gw_profiles_admin ON public.gw_profiles(is_admin) WHERE is_admin = true;

-- Update RLS policies to handle the expanded profile data
DROP POLICY IF EXISTS "Users can view all profiles" ON public.gw_profiles;
CREATE POLICY "Users can view all profiles" ON public.gw_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
CREATE POLICY "Users can update their own profile" ON public.gw_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies for managing user profiles
CREATE POLICY "Admins can update any profile" ON public.gw_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles gp 
            WHERE gp.user_id = auth.uid() 
            AND (gp.is_admin = true OR gp.is_super_admin = true)
        )
    );

CREATE POLICY "Admins can insert profiles" ON public.gw_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gw_profiles gp 
            WHERE gp.user_id = auth.uid() 
            AND (gp.is_admin = true OR gp.is_super_admin = true)
        )
    );

-- Executive board policies
CREATE POLICY "Exec board can view admin fields" ON public.gw_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles gp 
            WHERE gp.user_id = auth.uid() 
            AND (gp.is_exec_board = true OR gp.is_admin = true OR gp.is_super_admin = true)
        )
    );