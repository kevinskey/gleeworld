-- User Dashboard Customization Tables

-- Table for storing user dashboard preferences
CREATE TABLE IF NOT EXISTS public.user_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout_config jsonb DEFAULT '{"columns": 3, "gap": 4}'::jsonb,
  theme_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Table for storing which modules a user has enabled/visible
CREATE TABLE IF NOT EXISTS public.user_dashboard_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  is_visible boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  display_order integer DEFAULT 0,
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Table for storing user category ordering and visibility
CREATE TABLE IF NOT EXISTS public.user_dashboard_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  is_collapsed boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dashboard_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dashboard_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_dashboard_preferences
CREATE POLICY "Users can view their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_dashboard_modules
CREATE POLICY "Users can view their own dashboard modules"
  ON public.user_dashboard_modules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard modules"
  ON public.user_dashboard_modules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard modules"
  ON public.user_dashboard_modules
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard modules"
  ON public.user_dashboard_modules
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_dashboard_categories
CREATE POLICY "Users can view their own dashboard categories"
  ON public.user_dashboard_categories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard categories"
  ON public.user_dashboard_categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard categories"
  ON public.user_dashboard_categories
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard categories"
  ON public.user_dashboard_categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_dashboard_preferences_updated_at
  BEFORE UPDATE ON public.user_dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboard_updated_at();

CREATE TRIGGER update_user_dashboard_modules_updated_at
  BEFORE UPDATE ON public.user_dashboard_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboard_updated_at();

CREATE TRIGGER update_user_dashboard_categories_updated_at
  BEFORE UPDATE ON public.user_dashboard_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboard_updated_at();

-- Add indexes for better performance
CREATE INDEX idx_user_dashboard_preferences_user_id ON public.user_dashboard_preferences(user_id);
CREATE INDEX idx_user_dashboard_modules_user_id ON public.user_dashboard_modules(user_id);
CREATE INDEX idx_user_dashboard_modules_module_id ON public.user_dashboard_modules(module_id);
CREATE INDEX idx_user_dashboard_categories_user_id ON public.user_dashboard_categories(user_id);