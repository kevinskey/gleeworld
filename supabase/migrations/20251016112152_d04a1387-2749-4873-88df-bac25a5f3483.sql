-- Create table for member quick actions (customizable module shortcuts)
CREATE TABLE IF NOT EXISTS public.gw_member_quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.gw_member_quick_actions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own quick actions
CREATE POLICY "Users can view their own quick actions"
  ON public.gw_member_quick_actions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick actions"
  ON public.gw_member_quick_actions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick actions"
  ON public.gw_member_quick_actions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick actions"
  ON public.gw_member_quick_actions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all quick actions
CREATE POLICY "Admins can manage all quick actions"
  ON public.gw_member_quick_actions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_gw_member_quick_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gw_member_quick_actions_updated_at_trigger
BEFORE UPDATE ON public.gw_member_quick_actions
FOR EACH ROW
EXECUTE FUNCTION update_gw_member_quick_actions_updated_at();