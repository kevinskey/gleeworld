-- Per-track record-offset so a vocal captured mid-playback aligns with
-- the backing on subsequent plays. record_offset_sec stores the master
-- timeline position at the moment MediaRecorder started; on playback
-- we delay that track's source.start() by the same amount.
--
-- Without this, the scenario was:
--   Play (t=0) → 3s later hit Record → sing for 30s → stop
--   blob is 30s long, but contains audio that should align with t=3..33
--   Replay → blob starts at t=0, so vocal is 3s ahead. Now fixed.

ALTER TABLE public.gw_part_tracks_tracks
  ADD COLUMN IF NOT EXISTS record_offset_sec DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE public.gw_part_tracks_recordings
  ADD COLUMN IF NOT EXISTS record_offset_sec DOUBLE PRECISION NOT NULL DEFAULT 0;
