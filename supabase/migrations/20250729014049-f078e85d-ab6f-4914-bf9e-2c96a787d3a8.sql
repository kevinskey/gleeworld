-- Update contract policies to give tour managers proper access

-- Update contracts table policies
DROP POLICY IF EXISTS "Tour managers can view all contracts" ON contracts;
CREATE POLICY "Tour managers can view all contracts" 
ON contracts 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Tour managers can update contracts" ON contracts;
CREATE POLICY "Tour managers can update contracts" 
ON contracts 
FOR UPDATE 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR auth.uid() = created_by
);

-- Update contracts_v2 table policies
DROP POLICY IF EXISTS "Tour managers can view all contracts_v2" ON contracts_v2;
CREATE POLICY "Tour managers can view all contracts_v2" 
ON contracts_v2 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Tour managers can update contracts_v2" ON contracts_v2;
CREATE POLICY "Tour managers can update contracts_v2" 
ON contracts_v2 
FOR UPDATE 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Tour managers can create contracts_v2" ON contracts_v2;
CREATE POLICY "Tour managers can create contracts_v2" 
ON contracts_v2 
FOR INSERT 
WITH CHECK (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR created_by = auth.uid()
);

-- Update contract signatures policies  
DROP POLICY IF EXISTS "Tour managers can view contract signatures" ON contract_signatures;
CREATE POLICY "Tour managers can view contract signatures" 
ON contract_signatures 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Tour managers can view contract signatures v2" ON contract_signatures_v2;
CREATE POLICY "Tour managers can view contract signatures v2" 
ON contract_signatures_v2 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR EXISTS (
    SELECT 1 FROM contracts_v2 c 
    WHERE c.id = contract_signatures_v2.contract_id 
    AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tour managers can update contract signatures v2" ON contract_signatures_v2;
CREATE POLICY "Tour managers can update contract signatures v2" 
ON contract_signatures_v2 
FOR UPDATE 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR EXISTS (
    SELECT 1 FROM contracts_v2 c 
    WHERE c.id = contract_signatures_v2.contract_id 
    AND c.created_by = auth.uid()
  )
);

-- Update contract recipients policies
DROP POLICY IF EXISTS "Tour managers can view contract recipients" ON contract_recipients;
CREATE POLICY "Tour managers can view contract recipients" 
ON contract_recipients 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR EXISTS (
    SELECT 1 FROM contracts_v2 c 
    WHERE c.id = contract_recipients.contract_id 
    AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tour managers can view contract recipients v2" ON contract_recipients_v2;
CREATE POLICY "Tour managers can view contract recipients v2" 
ON contract_recipients_v2 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
  OR EXISTS (
    SELECT 1 FROM contracts_v2 c 
    WHERE c.id = contract_recipients_v2.contract_id 
    AND c.created_by = auth.uid()
  )
);