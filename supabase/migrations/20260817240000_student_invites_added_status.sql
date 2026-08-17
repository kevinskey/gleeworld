-- gw-invite-student logs status 'added' when called with sendEmail:false
-- (account + membership created, no email), but the status check only
-- allowed pending/sent/accepted/failed — so no-email invites were never
-- logged. Allow 'added'.
-- Self-hosted: record-only; apply by hand as supabase_admin.

alter table public.gw_student_invites
  drop constraint if exists gw_student_invites_status_check;
alter table public.gw_student_invites
  add constraint gw_student_invites_status_check
  check (status = any (array['pending'::text, 'sent'::text, 'added'::text, 'accepted'::text, 'failed'::text]));
