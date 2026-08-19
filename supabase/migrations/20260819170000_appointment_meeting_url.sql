-- Where the meeting actually happens.
--
-- gw_services.location holds a label ("Zoom", "In person"), not a joinable
-- URL, and nothing on gw_appointments held a link at all — so the confirmation
-- email promised a meeting link that no column could supply. Guest bookings
-- get a Google Meet link minted at confirmation time; store it per appointment
-- so the email, the SMS, and any later reminder all quote the same URL.
ALTER TABLE public.gw_appointments
  ADD COLUMN IF NOT EXISTS meeting_url TEXT;
