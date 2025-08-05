-- First, let's update the contracts table RLS policies to be more restrictive
-- Drop the existing tour manager policy that allows viewing all contracts
DROP POLICY IF EXISTS "Tour managers can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Tour managers can update contracts" ON public.contracts;

-- Create more restrictive policies for contracts table
CREATE POLICY "Super admins can manage all contracts" ON public.contracts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

CREATE POLICY "Users can view contracts they created or are assigned to" ON public.contracts
FOR SELECT USING (
  -- User created the contract
  auth.uid() = created_by 
  OR 
  -- User is assigned to the contract via contract_user_assignments
  EXISTS (
    SELECT 1 FROM public.contract_user_assignments 
    WHERE contract_id = contracts.id AND user_id = auth.uid()
  )
  OR
  -- User is assigned to the contract via singer_contract_assignments  
  EXISTS (
    SELECT 1 FROM public.singer_contract_assignments
    WHERE contract_id = contracts.id AND singer_id = auth.uid()
  )
);

-- Update contracts_v2 table policies (if it exists)
-- First check if the table exists and has policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts_v2') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Tour managers can view all contracts v2" ON public.contracts_v2;
    DROP POLICY IF EXISTS "Tour managers can update contracts v2" ON public.contracts_v2;
    
    -- Create new restrictive policies
    EXECUTE 'CREATE POLICY "Super admins can manage all contracts v2" ON public.contracts_v2
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() AND is_super_admin = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Users can view contracts v2 they created or are recipients of" ON public.contracts_v2
    FOR SELECT USING (
      auth.uid() = created_by 
      OR 
      EXISTS (
        SELECT 1 FROM public.contract_recipients_v2 
        WHERE contract_id = contracts_v2.id 
        AND recipient_email IN (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
      )
    )';
    
    EXECUTE 'CREATE POLICY "Users can update contracts v2 they created" ON public.contracts_v2
    FOR UPDATE USING (auth.uid() = created_by)';
  END IF;
END $$;

-- Update contract_signatures table policies
DROP POLICY IF EXISTS "Tour managers can view contract signatures" ON public.contract_signatures;

CREATE POLICY "Super admins can manage all contract signatures" ON public.contract_signatures
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

CREATE POLICY "Users can view signatures for their contracts" ON public.contract_signatures
FOR SELECT USING (
  -- User is the signer
  auth.uid() = user_id
  OR
  -- User is the admin who created the signature process
  auth.uid() = admin_id
  OR
  -- User created the original contract
  EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE id = contract_signatures.contract_id AND created_by = auth.uid()
  )
);

-- Update contract_signatures_v2 table policies
DROP POLICY IF EXISTS "Tour managers can view contract signatures v2" ON public.contract_signatures_v2;
DROP POLICY IF EXISTS "Tour managers can update contract signatures v2" ON public.contract_signatures_v2;

CREATE POLICY "Super admins can manage all contract signatures v2" ON public.contract_signatures_v2
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

-- Update contract_recipients table policies
DROP POLICY IF EXISTS "Admins and tour managers can manage contract recipients" ON public.contract_recipients;

CREATE POLICY "Super admins can manage all contract recipients" ON public.contract_recipients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

CREATE POLICY "Users can view recipients of their contracts" ON public.contract_recipients
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.contracts_v2 
    WHERE id = contract_recipients.contract_id AND created_by = auth.uid()
  )
);

-- Update contract_recipients_v2 table policies  
DROP POLICY IF EXISTS "Tour managers can view contract recipients v2" ON public.contract_recipients_v2;

CREATE POLICY "Super admins can manage all contract recipients v2" ON public.contract_recipients_v2
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);

CREATE POLICY "Users can view recipients v2 of their contracts" ON public.contract_recipients_v2
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.contracts_v2 
    WHERE id = contract_recipients_v2.contract_id AND created_by = auth.uid()
  )
);

-- Create a security definer function to check if user can access a contract
CREATE OR REPLACE FUNCTION public.user_can_access_contract(contract_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- User is super admin
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
  OR EXISTS (
    -- User created the contract
    SELECT 1 FROM public.contracts 
    WHERE id = contract_id_param AND created_by = auth.uid()
  )
  OR EXISTS (
    -- User is assigned to the contract
    SELECT 1 FROM public.contract_user_assignments 
    WHERE contract_id = contract_id_param AND user_id = auth.uid()
  )
  OR EXISTS (
    -- User is a singer assigned to the contract
    SELECT 1 FROM public.singer_contract_assignments
    WHERE contract_id = contract_id_param AND singer_id = auth.uid()
  );
$$;