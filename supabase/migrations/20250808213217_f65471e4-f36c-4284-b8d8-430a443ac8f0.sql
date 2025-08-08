-- Enable RLS and add clear SELECT policies for media visibility
-- This ensures admins see all items, users see their own uploads, and everyone sees public media

-- Enable RLS (safe if already enabled)
ALTER TABLE public.gw_media_library ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read items explicitly marked public
CREATE POLICY "Public can view public media"
ON public.gw_media_library
FOR SELECT
USING (COALESCE(is_public, false) = true);

-- Allow authenticated users to read their own uploads
CREATE POLICY "Users can view their own media"
ON public.gw_media_library
FOR SELECT
USING (uploaded_by = auth.uid());

-- Allow admins/super-admins to read all media
CREATE POLICY "Admins can view all media"
ON public.gw_media_library
FOR SELECT
USING (public.is_current_user_admin_or_super_admin());