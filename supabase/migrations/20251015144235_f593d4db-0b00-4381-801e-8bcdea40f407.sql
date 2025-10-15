-- Create module favorites table
CREATE TABLE IF NOT EXISTS public.gw_module_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable Row Level Security
ALTER TABLE public.gw_module_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for module favorites
CREATE POLICY "Users can view their own module favorites"
ON public.gw_module_favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own module favorites"
ON public.gw_module_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own module favorites"
ON public.gw_module_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_module_favorites_user_id ON public.gw_module_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_module_favorites_module_id ON public.gw_module_favorites(module_id);