
-- Create temporary policies for contract_templates table to allow operations without auth
CREATE POLICY "Allow anyone to insert templates" 
  ON public.contract_templates 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow anyone to select templates" 
  ON public.contract_templates 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to update templates" 
  ON public.contract_templates 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Allow anyone to delete templates" 
  ON public.contract_templates 
  FOR DELETE 
  USING (true);
