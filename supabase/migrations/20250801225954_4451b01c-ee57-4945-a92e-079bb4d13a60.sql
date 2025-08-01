-- Add decorations column to gw_buckets_of_love table
ALTER TABLE public.gw_buckets_of_love 
ADD COLUMN decorations TEXT DEFAULT '';

-- Add a comment to explain the column
COMMENT ON COLUMN public.gw_buckets_of_love.decorations IS 'Emoji decorations that users can add to their love messages';