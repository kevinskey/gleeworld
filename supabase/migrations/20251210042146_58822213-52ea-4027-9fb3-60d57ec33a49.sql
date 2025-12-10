-- Add youtube_urls column to gw_social_posts for YouTube video integration
ALTER TABLE public.gw_social_posts
ADD COLUMN youtube_urls TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.gw_social_posts.youtube_urls IS 'Array of YouTube video URLs or IDs embedded in the post';