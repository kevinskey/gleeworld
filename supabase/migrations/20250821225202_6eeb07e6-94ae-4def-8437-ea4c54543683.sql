-- Create table to store custom module ordering
CREATE TABLE IF NOT EXISTS gw_module_ordering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  module_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category, module_key)
);

-- Enable RLS
ALTER TABLE gw_module_ordering ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own module ordering" 
ON gw_module_ordering 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_gw_module_ordering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_gw_module_ordering_updated_at
  BEFORE UPDATE ON gw_module_ordering
  FOR EACH ROW
  EXECUTE FUNCTION update_gw_module_ordering_updated_at();