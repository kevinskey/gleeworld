-- create_recurring_rehearsals is an unauthenticated write vector. Closing it.
--
-- Found while completing the owner-role gap: it was on the list of functions
-- with an admin-looking role check, but that check is NOT authorization — it
-- picks a fallback created_by user. The function has NO caller check at all.
--
-- What that means in production, all verified:
--   * SECURITY DEFINER, so it runs as the owner and bypasses RLS
--   * EXECUTE granted to PUBLIC, anon AND authenticated
--   * it INSERTs into gw_events
--
-- So any ANONYMOUS caller could write events into the calendar by passing a
-- created_by_id (which also skips the one branch that would have errored).
--
-- It is also unusable and unwanted as written:
--   * the NULL-created_by branch reads public.profiles, which DOES NOT EXIST
--   * it hardcodes "Spelman College Glee Club Rehearsal" and "Spelman College
--     Music Building" — one build serves ~50 white-label tenants
--   * no tenant_id on the insert
--
-- Dead: zero call sites in src/ or supabase/functions (the only match is the
-- generated types.ts), and zero rows with that title exist.
--
-- REVOKE rather than DROP deliberately. It closes the hole immediately and is
-- reversible; dropping a function in production is not. The right end state is
-- almost certainly to delete it, but that should be a decision, not a
-- side effect of a permissions sweep.
REVOKE EXECUTE ON FUNCTION public.create_recurring_rehearsals(date, date, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_recurring_rehearsals(date, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_recurring_rehearsals(date, date, uuid) FROM authenticated;

COMMENT ON FUNCTION public.create_recurring_rehearsals(date, date, uuid) IS
  'DISABLED 2026-08-09: unauthenticated write vector. SECURITY DEFINER with no '
  'caller check and EXECUTE granted to anon. Also hardcodes an institution name '
  'and reads public.profiles, which does not exist. Unused — candidate for DROP.';
