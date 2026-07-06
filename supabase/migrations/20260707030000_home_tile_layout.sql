-- Per-user House home tile layout (jiggle-mode customization).
-- NULL / unparseable / unknown version = default layout, so existing
-- users see no change until they customize.
-- Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS home_tile_layout jsonb DEFAULT NULL;
