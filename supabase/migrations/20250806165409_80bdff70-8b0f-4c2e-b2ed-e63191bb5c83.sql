-- Update user roles enum to include new roles
DO $$
BEGIN
    -- Check if the enum already exists and drop/recreate it
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        DROP TYPE user_role_enum CASCADE;
    END IF;
END $$;

-- Create updated user role enum with all the new roles
CREATE TYPE user_role_enum AS ENUM (
    'visitor',
    'fan', 
    'auditioner',
    'alumna',
    'member',
    'admin',
    'super-admin'
);

-- Create user role transitions table for tracking role changes
CREATE TABLE public.user_role_transitions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    from_role TEXT,
    to_role TEXT NOT NULL,
    transition_reason TEXT,
    changed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT
);

-- Enable RLS on user role transitions
ALTER TABLE public.user_role_transitions ENABLE ROW LEVEL SECURITY;

-- Create policies for user role transitions
CREATE POLICY "Admins can view all role transitions" 
ON public.user_role_transitions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    )
);

CREATE POLICY "Users can view their own role transitions" 
ON public.user_role_transitions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert role transitions" 
ON public.user_role_transitions 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    )
);

-- Create function to handle role transitions with audit logging
CREATE OR REPLACE FUNCTION public.transition_user_role(
    target_user_id UUID,
    new_role TEXT,
    reason TEXT DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_role TEXT;
    admin_user_id UUID;
BEGIN
    admin_user_id := auth.uid();
    
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = admin_user_id 
        AND (is_admin = true OR is_super_admin = true)
    ) THEN
        RAISE EXCEPTION 'Only admins can transition user roles';
    END IF;
    
    -- Get current role
    SELECT role INTO current_role 
    FROM public.gw_profiles 
    WHERE user_id = target_user_id;
    
    IF current_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Update the user's role
    UPDATE public.gw_profiles 
    SET role = new_role, updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Log the transition
    INSERT INTO public.user_role_transitions (
        user_id, from_role, to_role, transition_reason, changed_by, notes
    ) VALUES (
        target_user_id, current_role, new_role, reason, admin_user_id, admin_notes
    );
    
    RETURN true;
END;
$$;

-- Create function for automatic auditioner to member promotion
CREATE OR REPLACE FUNCTION public.promote_auditioner_to_member(
    auditioner_user_id UUID,
    audition_application_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check if user is currently an auditioner
    IF NOT EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auditioner_user_id 
        AND role = 'auditioner'
    ) THEN
        RAISE EXCEPTION 'User is not an auditioner or does not exist';
    END IF;
    
    -- Update role to member
    UPDATE public.gw_profiles 
    SET role = 'member', updated_at = now()
    WHERE user_id = auditioner_user_id;
    
    -- Log the transition
    INSERT INTO public.user_role_transitions (
        user_id, from_role, to_role, transition_reason, notes
    ) VALUES (
        auditioner_user_id, 
        'auditioner', 
        'member', 
        'audition_success',
        'Promoted after successful audition completion'
    );
    
    RETURN true;
END;
$$;

-- Update the handle_new_user_profile trigger to assign appropriate default roles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
    signup_context TEXT;
BEGIN
    -- Check signup context from user metadata
    signup_context := NEW.raw_user_meta_data ->> 'signup_context';
    
    INSERT INTO public.gw_profiles (
        user_id,
        email,
        full_name,
        first_name,
        last_name,
        role,
        verified
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name',
        CASE 
            WHEN signup_context = 'audition' THEN 'auditioner'
            WHEN signup_context = 'fan' THEN 'fan'
            WHEN signup_context = 'alumna' THEN 'alumna'
            ELSE 'fan' -- Default fallback
        END,
        false
    );
    
    RETURN NEW;
END;
$$;