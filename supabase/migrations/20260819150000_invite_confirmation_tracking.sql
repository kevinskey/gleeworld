-- Track that booking confirmations went out, so a page refresh or a retried
-- request cannot text the same people twice.
ALTER TABLE public.gw_booking_invites
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;

-- Invitee phone is captured on the appointment (client_phone), but the invite
-- needs it too: the confirmation runs off the invite token and should not have
-- to re-derive which appointment it belongs to just to find a number.
ALTER TABLE public.gw_booking_invites
  ADD COLUMN IF NOT EXISTS invitee_phone TEXT;
