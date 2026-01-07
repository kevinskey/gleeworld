-- Add RLS policy for youtube_videos to allow authenticated users to insert
CREATE POLICY "Authenticated users can insert youtube videos"
ON public.youtube_videos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy to allow authenticated users to update youtube videos (for featuring)
CREATE POLICY "Authenticated users can update youtube videos"
ON public.youtube_videos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add policy to allow authenticated users to delete youtube videos
CREATE POLICY "Authenticated users can delete youtube videos"
ON public.youtube_videos
FOR DELETE
TO authenticated
USING (true);

-- Also add policies for youtube_channels table
CREATE POLICY "Authenticated users can insert youtube channels"
ON public.youtube_channels
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update youtube channels"
ON public.youtube_channels
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);