-- C2 fix (2026-08-06 review): book_appointment was never actually locked
-- down.
--
-- 20260806120000_public_intake.sql's comment claimed book_appointment was
-- "deliberately NOT granted to anon" so every public booking would have to
-- go through the public-intake edge function (the only place the rate
-- limit is enforced). But CREATE [OR REPLACE] FUNCTION grants EXECUTE to
-- PUBLIC by default, and nothing in that migration — or any earlier one —
-- ever revoked it. Anon could (and can, right now) POST
-- /rest/v1/rpc/book_appointment directly, bypassing public-intake and its
-- rate limit entirely. check_appointment_availability has the identical
-- exposure.
--
-- Fix, following the same shape as 20260611000000_qr_token_rpc_lockdown.sql:
-- revoke from PUBLIC and anon explicitly, then re-grant to the roles that
-- actually need it. authenticated keeps working — StudentBooking.tsx:185
-- and useAppointments.ts:116,137 call both RPCs from the authenticated
-- dashboard. service_role needs its own explicit grant too: revoking from
-- PUBLIC also revokes whatever service_role had inherited through it, and
-- public-intake/index.ts calls both RPCs as service_role.
--
-- Signatures must match exactly or the REVOKE/GRANT silently targets
-- nothing (Postgres resolves function REVOKE/GRANT by full argument-type
-- signature, not by name alone). Verified against every CREATE OR REPLACE
-- FUNCTION for each of these two functions across the migration history —
-- neither has ever had more than one signature.

REVOKE EXECUTE ON FUNCTION public.book_appointment(
  uuid, date, time, text, text, text, integer, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.book_appointment(
  uuid, date, time, text, text, text, integer, text
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_appointment_availability(
  uuid, date, time, integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.check_appointment_availability(
  uuid, date, time, integer
) TO authenticated, service_role;

-- Both functions are SECURITY DEFINER and call each other (book_appointment
-- calls check_appointment_availability internally, and
-- get_available_time_slots — still anon-granted from the prior migration —
-- does its own availability math). Postgres does not re-check the calling
-- role's EXECUTE privilege for a function-to-function call inside a
-- SECURITY DEFINER body, only for the outer entry point actually invoked by
-- the client, so revoking check_appointment_availability from anon does not
-- break get_available_time_slots or book_appointment's internal use of it.
