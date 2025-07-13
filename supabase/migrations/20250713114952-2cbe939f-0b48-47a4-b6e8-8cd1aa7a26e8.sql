-- Enable RLS on gw_youtube_videos table
ALTER TABLE public.gw_youtube_videos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert videos
CREATE POLICY "Authenticated users can insert youtube videos" 
ON public.gw_youtube_videos 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update videos
CREATE POLICY "Authenticated users can update youtube videos" 
ON public.gw_youtube_videos 
FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete videos
CREATE POLICY "Authenticated users can delete youtube videos" 
ON public.gw_youtube_videos 
FOR DELETE 
TO authenticated 
USING (auth.uid() IS NOT NULL);