-- Consolidate QR attendance tables: Drop the unused gw_attendance_qr_tokens table
-- All QR functionality now uses gw_attendance_qr_codes as the single source of truth

-- First, drop the policies
DROP POLICY IF EXISTS "Users can view QR tokens they created" ON gw_attendance_qr_tokens;
DROP POLICY IF EXISTS "Users can create QR tokens" ON gw_attendance_qr_tokens;
DROP POLICY IF EXISTS "Users can update their QR tokens" ON gw_attendance_qr_tokens;

-- Drop indexes
DROP INDEX IF EXISTS idx_attendance_qr_tokens_token;
DROP INDEX IF EXISTS idx_attendance_qr_tokens_event_id;
DROP INDEX IF EXISTS idx_attendance_qr_tokens_expires_at;

-- Drop the table
DROP TABLE IF EXISTS gw_attendance_qr_tokens;

-- Add a comment to the canonical table for documentation
COMMENT ON TABLE gw_attendance_qr_codes IS 'Single source of truth for all QR attendance codes. Used by generate_session_qr_code and process_qr_attendance_scan functions.';