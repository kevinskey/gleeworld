-- Allow 'template' as a newsletter status so reusable templates live in gw_newsletters.
alter table public.gw_newsletters drop constraint gw_newsletters_status_check;
alter table public.gw_newsletters add constraint gw_newsletters_status_check
  check (status = any (array['draft','scheduled','sent','failed','template']));
