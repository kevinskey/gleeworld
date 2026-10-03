-- SECURITY: students' graded submissions were in a PUBLIC bucket.
--
-- storage.buckets.assignment-submissions had public = true, so every object
-- was served by /storage/v1/object/public/... with no authentication at all —
-- to anyone who ever saw or guessed the URL, from any tenant or no session.
-- The contents are coursework: learning journals as PDFs and audio, submitted
-- by students. Confirmed 2026-10-02: 8 objects, all of the form
-- <student_user_id>/<name>, and storage.objects.owner matches that first path
-- segment for 8 of 8 — so owner-based policy fits the data exactly.
--
-- Two changes, both required. Flipping the bucket alone is not enough: the
-- `public` flag only controls the unauthenticated /object/public/ route, while
-- the authenticated route is governed by storage_auth_select, whose first
-- branch admits ANY authenticated user to any bucket that is not "sensitive".
-- Without the second change a signed-in member of any tenant could still read
-- every submission.

-- 1. No more unauthenticated public route.
UPDATE storage.buckets SET public = false WHERE id = 'assignment-submissions';

-- 2. Mark it sensitive so storage_auth_select stops admitting all
--    authenticated users. After this the policy's remaining branches give
--    access to the owner (the submitting student) and to is_admin /
--    is_super_admin.
CREATE OR REPLACE FUNCTION public.is_sensitive_bucket(p_bucket_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT p_bucket_id IN (
    'w9-forms', 'id-documents', 'signed-contracts', 'contract-documents',
    'contract-signatures', 'tour-contracts', 'budget-documents', 'receipts',
    'excuse-documents', 'executive-board-files', 'hair-nail-photos',
    'performer-documents', 'personal-scores',
    'studio', 'studio-video', 'parttrack',
    'songwriting',
    -- Added 2026-08-11. Personal document library (Documents word processor).
    -- The gw_personal_docs table is owner-only; this stops the in-document
    -- images being readable by anyone holding a path. Required because
    -- 20260811233000 exempts this bucket from tenant_isolation_restrict.
    'personal-docs',
    -- Added 2026-10-03. Student coursework. See header.
    'assignment-submissions'
  )
$function$;

-- 3. Graders. storage_auth_select's admin branch is is_admin/is_super_admin
--    only, but a course's instructor is not necessarily flagged either — of
--    the 9 profiles with role='admin', only 4 carry an elevated flag. Without
--    this a legitimate instructor would silently lose the ability to open
--    their own students' submissions, which is exactly the kind of "the app
--    is broken" failure that costs trust.
--
--    Path shape is <student_user_id>/... today and <course_id>/<assignment_id>/
--    <student_user_id>/... from the newer uploader (StudentAssignmentDialog),
--    so match the student id in EITHER position rather than assuming one.
DROP POLICY IF EXISTS "instructors read their students submissions" ON storage.objects;
CREATE POLICY "instructors read their students submissions"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1
    FROM public.gw_courses c
    JOIN public.gw_course_enrollments e ON e.course_id = c.id
    WHERE c.instructor_id = auth.uid()
      AND COALESCE(e.user_id, e.student_profile_id)::text IN (
        (storage.foldername(storage.objects.name))[1],
        (storage.foldername(storage.objects.name))[3]
      )
  )
);
