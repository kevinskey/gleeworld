
-- Create a policy to allow anyone to insert contracts (temporary until auth is implemented)
CREATE POLICY "Allow anyone to insert contracts" 
  ON public.contracts_v2 
  FOR INSERT 
  WITH CHECK (true);

-- Create a policy to allow anyone to select contracts (temporary until auth is implemented)
CREATE POLICY "Allow anyone to select contracts" 
  ON public.contracts_v2 
  FOR SELECT 
  USING (true);

-- Create a policy to allow anyone to update contracts (temporary until auth is implemented)
CREATE POLICY "Allow anyone to update contracts" 
  ON public.contracts_v2 
  FOR UPDATE 
  USING (true);
