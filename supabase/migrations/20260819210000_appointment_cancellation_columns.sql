-- gw_appointments never had cancelled_at / cancellation_reason, but three
-- separate code paths write them:
--   • useCancelAppointment (src/hooks/useAppointments.ts) — pre-existing
--   • deleteCalendarItem, when cancelling an appointment from the calendar
--   • cancel_invite_booking, for guest-initiated cancels
-- The generated Supabase types even declare them, so nothing flagged it at
-- compile time; each call just failed at runtime with 42703. Cancelling an
-- appointment has been quietly impossible.
--
-- Adding the columns is the smaller fix than rewriting three callers, and it
-- makes "when was this cancelled, and why" answerable — which status alone
-- cannot express.
ALTER TABLE public.gw_appointments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
