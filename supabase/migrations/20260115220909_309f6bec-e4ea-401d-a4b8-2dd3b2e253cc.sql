-- Create table for user-editable module resources
CREATE TABLE public.lh100_module_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'document',
  url TEXT,
  duration TEXT,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lh100_module_resources ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view all resources
CREATE POLICY "Authenticated users can view all module resources" 
ON public.lh100_module_resources 
FOR SELECT 
TO authenticated
USING (true);

-- Any authenticated user can create resources
CREATE POLICY "Authenticated users can create module resources" 
ON public.lh100_module_resources 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Any authenticated user can update any resource
CREATE POLICY "Authenticated users can update module resources" 
ON public.lh100_module_resources 
FOR UPDATE 
TO authenticated
USING (true);

-- Any authenticated user can delete resources they created
CREATE POLICY "Users can delete their own resources" 
ON public.lh100_module_resources 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_lh100_module_resources_updated_at
BEFORE UPDATE ON public.lh100_module_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_lh100_module_resources_module ON public.lh100_module_resources(module_id);