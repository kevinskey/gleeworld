-- Create required storage buckets if they don't exist
-- Public buckets: user-files, marked-scores, service-images
-- Private buckets: sheet-music, w9-forms, receipts, contract-signatures, signed-contracts, contract-documents, performer-documents, alumni-headshots, budget-documents, executive-board-files

-- Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('sheet-music', 'sheet-music', false),
  ('marked-scores', 'marked-scores', true),
  ('user-files', 'user-files', true),
  ('service-images', 'service-images', true),
  ('w9-forms', 'w9-forms', false),
  ('receipts', 'receipts', false),
  ('contract-signatures', 'contract-signatures', false),
  ('signed-contracts', 'signed-contracts', false),
  ('contract-documents', 'contract-documents', false),
  ('performer-documents', 'performer-documents', false),
  ('alumni-headshots', 'alumni-headshots', true),
  ('budget-documents', 'budget-documents', false),
  ('executive-board-files', 'executive-board-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: create only if they don't already exist
-- Helper: public read for specific public buckets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read on marked-scores'
  ) THEN
    CREATE POLICY "Public read on marked-scores"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'marked-scores');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read on user-files'
  ) THEN
    CREATE POLICY "Public read on user-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'user-files');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read on service-images'
  ) THEN
    CREATE POLICY "Public read on service-images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'service-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read on alumni-headshots'
  ) THEN
    CREATE POLICY "Public read on alumni-headshots"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'alumni-headshots');
  END IF;
END $$;

-- Sheet music: authenticated can SELECT (needed for signed URLs), admins can INSERT/UPDATE/DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Auth select on sheet-music'
  ) THEN
    CREATE POLICY "Auth select on sheet-music"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'sheet-music' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage sheet-music'
  ) THEN
    CREATE POLICY "Admins manage sheet-music"
    ON storage.objects FOR ALL
    USING (bucket_id = 'sheet-music' AND public.is_current_user_admin_or_super_admin())
    WITH CHECK (bucket_id = 'sheet-music' AND public.is_current_user_admin_or_super_admin());
  END IF;
END $$;

-- Marked scores: any authenticated user can upload; everyone can read (public bucket already), allow owner-like updates if needed later
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Auth upload to marked-scores'
  ) THEN
    CREATE POLICY "Auth upload to marked-scores"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'marked-scores' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- User files: users can manage files inside their own folder (top-level folder = user id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their user-files folder'
  ) THEN
    CREATE POLICY "Users manage their user-files folder"
    ON storage.objects FOR ALL
    USING (
      bucket_id = 'user-files' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'user-files' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Service images: admins can upload/manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage service-images'
  ) THEN
    CREATE POLICY "Admins manage service-images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'service-images' AND public.is_current_user_admin_or_super_admin())
    WITH CHECK (bucket_id = 'service-images' AND public.is_current_user_admin_or_super_admin());
  END IF;
END $$;

-- Private admin-only buckets: allow admins to read/manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins read private buckets'
  ) THEN
    CREATE POLICY "Admins read private buckets"
    ON storage.objects FOR SELECT
    USING (
      bucket_id IN ('w9-forms','receipts','contract-signatures','signed-contracts','contract-documents','performer-documents','budget-documents','executive-board-files')
      AND public.is_current_user_admin_or_super_admin()
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage private buckets'
  ) THEN
    CREATE POLICY "Admins manage private buckets"
    ON storage.objects FOR ALL
    USING (
      bucket_id IN ('w9-forms','receipts','contract-signatures','signed-contracts','contract-documents','performer-documents','budget-documents','executive-board-files')
      AND public.is_current_user_admin_or_super_admin()
    )
    WITH CHECK (
      bucket_id IN ('w9-forms','receipts','contract-signatures','signed-contracts','contract-documents','performer-documents','budget-documents','executive-board-files')
      AND public.is_current_user_admin_or_super_admin()
    );
  END IF;
END $$;