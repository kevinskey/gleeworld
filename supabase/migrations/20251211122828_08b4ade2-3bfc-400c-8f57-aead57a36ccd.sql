-- Add sort_order column to gw_module_favorites for drag-and-drop ordering
ALTER TABLE public.gw_module_favorites 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_module_favorites_sort_order 
ON public.gw_module_favorites(user_id, sort_order);