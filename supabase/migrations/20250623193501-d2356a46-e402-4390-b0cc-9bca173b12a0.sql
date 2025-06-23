
-- Enable RLS on contracts table if not already enabled
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view contracts they created
CREATE POLICY "Users can view their own contracts" 
  ON public.contracts 
  FOR SELECT 
  USING (auth.uid() = created_by);

-- Allow authenticated users to create contracts
CREATE POLICY "Users can create contracts" 
  ON public.contracts 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to update their own contracts
CREATE POLICY "Users can update their own contracts" 
  ON public.contracts 
  FOR UPDATE 
  USING (auth.uid() = created_by);

-- Allow authenticated users to delete their own contracts
CREATE POLICY "Users can delete their own contracts" 
  ON public.contracts 
  FOR DELETE 
  USING (auth.uid() = created_by);
