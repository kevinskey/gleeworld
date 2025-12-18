-- Add optimization fields to gw_tours
ALTER TABLE gw_tours ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE gw_tours ADD COLUMN IF NOT EXISTS total_distance INTEGER DEFAULT 0;
ALTER TABLE gw_tours ADD COLUMN IF NOT EXISTS estimated_duration TEXT;
ALTER TABLE gw_tours ADD COLUMN IF NOT EXISTS estimated_cost INTEGER DEFAULT 0;