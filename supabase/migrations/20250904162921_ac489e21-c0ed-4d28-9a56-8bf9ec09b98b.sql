-- Add missing columns to contracts table for better management
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS due_date date,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_to uuid[],
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS event_id uuid,
ADD COLUMN IF NOT EXISTS amount numeric(10,2),
ADD COLUMN IF NOT EXISTS file_url text;

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_contracts_title ON public.contracts USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_contracts_content ON public.contracts USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON public.contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_archived ON public.contracts(archived);

-- Create RLS policies for contracts
DROP POLICY IF EXISTS "Users can view contracts they created or are assigned to" ON public.contracts;
DROP POLICY IF EXISTS "Users can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update contracts they created" ON public.contracts;
DROP POLICY IF EXISTS "Admins can manage all contracts" ON public.contracts;

CREATE POLICY "Users can view contracts they created or are assigned to" ON public.contracts
FOR SELECT USING (
  created_by = auth.uid() OR 
  auth.uid() = ANY(assigned_to) OR
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can create contracts" ON public.contracts
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update contracts they created or admins can update all" ON public.contracts
FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can delete contracts they created or admins can delete all" ON public.contracts
FOR DELETE USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Update the updated_at trigger
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contracts_updated_at_trigger ON public.contracts;
CREATE TRIGGER update_contracts_updated_at_trigger
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();