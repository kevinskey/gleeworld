-- Add missing columns to contracts table for better management
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS event_id uuid,
ADD COLUMN IF NOT EXISTS assigned_to uuid[],
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Create contract_members table for member assignments
CREATE TABLE IF NOT EXISTS public.contract_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  UNIQUE(contract_id, user_id)
);

-- Enable RLS on contract_members
ALTER TABLE public.contract_members ENABLE ROW LEVEL SECURITY;

-- Create policies for contract_members
CREATE POLICY "Users can view contract members for contracts they can access" 
ON public.contract_members 
FOR SELECT 
USING (
  user_can_access_contract(contract_id) OR 
  user_id = auth.uid()
);

CREATE POLICY "Admins and contract creators can assign members" 
ON public.contract_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE id = contract_id 
    AND (created_by = auth.uid() OR user_can_access_contract(id))
  )
);

CREATE POLICY "Admins and contract creators can remove members" 
ON public.contract_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE id = contract_id 
    AND (created_by = auth.uid() OR user_can_access_contract(id))
  )
);

-- Update contracts RLS policies for better access control
DROP POLICY IF EXISTS "Users can view contracts they created or are assigned to" ON public.contracts;
DROP POLICY IF EXISTS "Users can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update contracts they created" ON public.contracts;

CREATE POLICY "Users can view accessible contracts" 
ON public.contracts 
FOR SELECT 
USING (
  created_by = auth.uid() OR
  user_can_access_contract(id) OR
  EXISTS (
    SELECT 1 FROM public.contract_members cm 
    WHERE cm.contract_id = id AND cm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can create contracts" 
ON public.contracts 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update contracts they created or have access to" 
ON public.contracts 
FOR UPDATE 
USING (
  created_by = auth.uid() OR
  user_can_access_contract(id) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can delete contracts they created or admins" 
ON public.contracts 
FOR DELETE 
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add trigger to update contracts updated_at
CREATE OR REPLACE FUNCTION public.update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contracts_updated_at();