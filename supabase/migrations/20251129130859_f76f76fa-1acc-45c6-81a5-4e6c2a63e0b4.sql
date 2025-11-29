-- Add thumbnail_url column to pr_images table for video previews
ALTER TABLE pr_images 
ADD COLUMN thumbnail_url TEXT;