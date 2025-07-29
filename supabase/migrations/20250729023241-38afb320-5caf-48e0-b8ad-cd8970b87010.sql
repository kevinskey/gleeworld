-- Fix infinite recursion in RLS policies by creating security definer functions

-- Create function to check if user is admin/super-admin
CREATE OR REPLACE FUNCTION public.is_user_admin_or_super_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = user_id_param 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Create function to check if user is tour manager
CREATE OR REPLACE FUNCTION public.is_user_tour_manager(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param 
    AND position::text = 'tour_manager'
    AND is_active = true
  );
$$;

-- Update contracts RLS policies to use the new functions
DROP POLICY IF EXISTS "Tour managers can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Tour managers can update contracts" ON public.contracts;

CREATE POLICY "Tour managers can view all contracts" 
ON public.contracts 
FOR SELECT 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (auth.uid() = created_by)
);

CREATE POLICY "Tour managers can update contracts" 
ON public.contracts 
FOR UPDATE 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (auth.uid() = created_by)
);

-- Update contracts_v2 RLS policies
DROP POLICY IF EXISTS "Tour managers can view all contracts_v2" ON public.contracts_v2;
DROP POLICY IF EXISTS "Tour managers can update contracts_v2" ON public.contracts_v2;
DROP POLICY IF EXISTS "Tour managers can create contracts_v2" ON public.contracts_v2;

CREATE POLICY "Tour managers can view all contracts_v2" 
ON public.contracts_v2 
FOR SELECT 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (created_by = auth.uid())
);

CREATE POLICY "Tour managers can update contracts_v2" 
ON public.contracts_v2 
FOR UPDATE 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (created_by = auth.uid())
);

CREATE POLICY "Tour managers can create contracts_v2" 
ON public.contracts_v2 
FOR INSERT 
WITH CHECK (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (created_by = auth.uid())
);

-- Update contract signatures policies
DROP POLICY IF EXISTS "Tour managers can view contract signatures" ON public.contract_signatures;

CREATE POLICY "Tour managers can view contract signatures" 
ON public.contract_signatures 
FOR SELECT 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (auth.uid() = user_id)
);

-- Update contract signatures v2 policies  
DROP POLICY IF EXISTS "Tour managers can view contract signatures v2" ON public.contract_signatures_v2;
DROP POLICY IF EXISTS "Tour managers can update contract signatures v2" ON public.contract_signatures_v2;

CREATE POLICY "Tour managers can view contract signatures v2" 
ON public.contract_signatures_v2 
FOR SELECT 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (EXISTS ( SELECT 1 FROM contracts_v2 c WHERE c.id = contract_signatures_v2.contract_id AND c.created_by = auth.uid()))
);

CREATE POLICY "Tour managers can update contract signatures v2" 
ON public.contract_signatures_v2 
FOR UPDATE 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (EXISTS ( SELECT 1 FROM contracts_v2 c WHERE c.id = contract_signatures_v2.contract_id AND c.created_by = auth.uid()))
);

-- Update contract recipients policies
DROP POLICY IF EXISTS "Tour managers can view contract recipients" ON public.contract_recipients;

CREATE POLICY "Tour managers can view contract recipients" 
ON public.contract_recipients 
FOR SELECT 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (EXISTS ( SELECT 1 FROM contracts_v2 c WHERE c.id = contract_recipients.contract_id AND c.created_by = auth.uid()))
);

-- Update contract recipients v2 policies
DROP POLICY IF EXISTS "Tour managers can view contract recipients v2" ON public.contract_recipients_v2;

CREATE POLICY "Tour managers can view contract recipients v2" 
ON public.contract_recipients_v2 
FOR SELECT 
USING (
  is_user_admin_or_super_admin(auth.uid()) 
  OR is_user_tour_manager(auth.uid()) 
  OR (EXISTS ( SELECT 1 FROM contracts_v2 c WHERE c.id = contract_recipients_v2.contract_id AND c.created_by = auth.uid()))
);