-- Add policy to allow users to view published journal entries by others for peer review
create policy "users_view_published_entries_by_others"
on public.mus240_journal_entries
for select
using (is_published = true and auth.uid() != student_id);