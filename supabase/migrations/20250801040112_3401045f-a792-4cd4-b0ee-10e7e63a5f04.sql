-- Consolidate user system - Step 2: Handle enum conflicts and add columns properly

-- Add missing columns to profiles table, handling enum conflicts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS voice_part_text text,
ADD COLUMN IF NOT EXISTS class_year integer,
ADD COLUMN IF NOT EXISTS join_date date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS dues_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_exec_board boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exec_board_role text,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS graduation_year integer,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Migrate data from gw_profiles to profiles
UPDATE public.profiles 
SET 
    phone = gw.phone,
    voice_part_text = gw.voice_part::text,
    class_year = gw.class_year,
    join_date = gw.join_date,
    status = gw.status,
    dues_paid = gw.dues_paid,
    notes = gw.notes,
    is_admin = gw.is_admin,
    is_super_admin = gw.is_super_admin,
    is_exec_board = gw.is_exec_board,
    exec_board_role = gw.exec_board_role,
    title = gw.title,
    bio = gw.bio,
    graduation_year = gw.graduation_year,
    avatar_url = COALESCE(profiles.avatar_url, gw.avatar_url),
    verified = gw.verified,
    role = CASE 
        WHEN gw.is_super_admin = true THEN 'super-admin'
        WHEN gw.is_admin = true THEN 'admin'
        WHEN gw.role = 'member' THEN 'member'
        WHEN gw.role = 'fan' THEN 'fan'
        ELSE 'fan'
    END
FROM public.gw_profiles gw
WHERE profiles.id = gw.user_id;

-- Update any remaining "user" roles to appropriate defaults
UPDATE public.profiles 
SET role = CASE 
    WHEN is_super_admin = true THEN 'super-admin'
    WHEN is_admin = true THEN 'admin'
    WHEN is_exec_board = true THEN 'member'
    ELSE 'fan'
END
WHERE role = 'user' OR role IS NULL;

-- Add constraint to ensure valid roles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_roles,
ADD CONSTRAINT valid_roles CHECK (role IN ('fan', 'member', 'admin', 'super-admin'));

-- Now drop the voice_part enum column if it exists and create text version
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'voice_part') THEN
        ALTER TABLE public.profiles DROP COLUMN voice_part;
    END IF;
    ALTER TABLE public.profiles ADD COLUMN voice_part text;
    UPDATE public.profiles SET voice_part = voice_part_text;
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS voice_part_text;
END $$;

-- Update security functions to use profiles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;