-- Create contract_members table for managing contract assignments
CREATE TABLE public.contract_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID
);

-- Enable RLS
ALTER TABLE public.contract_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contract_members
CREATE POLICY "Users can view contract members for contracts they can access"
ON public.contract_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE id = contract_members.contract_id 
    AND (
      created_by = auth.uid() OR
      auth.uid() = ANY(assigned_to) OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  )
);

CREATE POLICY "Admins and contract creators can manage contract members"
ON public.contract_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE id = contract_members.contract_id 
    AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE id = contract_members.contract_id 
    AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_contract_members_contract_id ON public.contract_members(contract_id);
CREATE INDEX idx_contract_members_user_id ON public.contract_members(user_id);

-- Prevent duplicate assignments
CREATE UNIQUE INDEX idx_contract_members_unique ON public.contract_members(contract_id, user_id);