-- Enable RLS on tables that were missing it
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

-- Add basic policies for contract_documents
CREATE POLICY "Users can view their own contract documents"
ON public.contract_documents
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all contract documents"
ON public.contract_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add basic policies for contract_history
CREATE POLICY "Users can view contract history for their contracts"
ON public.contract_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contract_documents cd
    WHERE cd.id = contract_history.contract_id 
    AND cd.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all contract history"
ON public.contract_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);