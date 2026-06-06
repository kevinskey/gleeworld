-- Create a public "site-branding" storage bucket per tenant for the logo
-- and other site identity assets. Each tenant's Supabase has its own storage
-- container + volume, so this is already isolated.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-branding',
  'site-branding',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for anyone
DROP POLICY IF EXISTS "branding bucket public read" ON storage.objects;
CREATE POLICY "branding bucket public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-branding');

-- Admin/super-admin upload
DROP POLICY IF EXISTS "branding bucket admin write" ON storage.objects;
CREATE POLICY "branding bucket admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-branding'
    AND EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.is_admin = true OR p.role IN ('super-admin','admin'))
    )
  );

DROP POLICY IF EXISTS "branding bucket admin update" ON storage.objects;
CREATE POLICY "branding bucket admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'site-branding'
    AND EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.is_admin = true OR p.role IN ('super-admin','admin'))
    )
  );

DROP POLICY IF EXISTS "branding bucket admin delete" ON storage.objects;
CREATE POLICY "branding bucket admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'site-branding'
    AND EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.is_admin = true OR p.role IN ('super-admin','admin'))
    )
  );
