-- Per-user sidebar nav ordering (drag-to-reorder), sibling of
-- home_tile_layout. Shape: {"v": 1, "order": ["<catalog key>", ...]}.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS nav_item_order JSONB;
