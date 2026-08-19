-- Fix trigger firing order.
--
-- Postgres runs AFTER INSERT triggers in alphabetical order by name.
-- `on_auth_user_created_parent` < `on_auth_user_created_profile`, so
-- handle_parent_registration() ran FIRST and its
--   UPDATE gw_profiles SET role='parent' WHERE user_id = NEW.id
-- affected 0 rows because handle_new_user_profile() hadn't inserted
-- the row yet. The profile trigger then created the profile fresh
-- with the default role, and parents shipped as role='fan'.
--
-- Rename both add-on triggers to `on_auth_user_created_zz_...` so
-- they land AFTER `on_auth_user_created_profile` (and the `zz` prefix
-- reads as "run me last" to a future reader).

DROP TRIGGER IF EXISTS on_auth_user_created_parent ON auth.users;
CREATE TRIGGER on_auth_user_created_zz_parent
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_parent_registration();

DROP TRIGGER IF EXISTS on_auth_user_created_student_backfill ON auth.users;
CREATE TRIGGER on_auth_user_created_zz_student_backfill
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_student_backfill_parent_link();
