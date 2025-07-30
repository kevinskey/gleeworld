-- Fix RLS policies for financial and contract tables to allow proper admin access

-- Update gw_profiles table to use consistent admin checking
DROP POLICY IF EXISTS "Admins can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Only admins can manage contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Admins can manage all budgets" ON budgets;

-- Create consistent admin access policies for contracts table
CREATE POLICY "Admins can manage all contracts" ON contracts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create consistent admin access policies for contracts_v2 table  
DROP POLICY IF EXISTS "Tour managers can view all contracts_v2" ON contracts_v2;
DROP POLICY IF EXISTS "Tour managers can update contracts_v2" ON contracts_v2;
DROP POLICY IF EXISTS "Tour managers can create contracts_v2" ON contracts_v2;

CREATE POLICY "Admins and tour managers can manage contracts_v2" ON contracts_v2
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR 
  is_current_user_tour_manager()
);

-- Create consistent admin access policies for contract_documents table
CREATE POLICY "Admins can manage all contract documents" ON contract_documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create consistent admin access policies for budgets table
CREATE POLICY "Admins and super admins can manage all budgets" ON budgets
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Ensure contract signatures can be accessed by admins
DROP POLICY IF EXISTS "Admins can view all signatures" ON contract_signatures;
CREATE POLICY "Admins can manage all contract signatures" ON contract_signatures
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Fix contract recipients access
DROP POLICY IF EXISTS "Tour managers can view contract recipients" ON contract_recipients;
CREATE POLICY "Admins and tour managers can manage contract recipients" ON contract_recipients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR 
  is_current_user_tour_manager()
);