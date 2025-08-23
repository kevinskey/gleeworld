-- Fix Kennidy Troupe's alumnae liaison position
-- First, create her executive board member entry
INSERT INTO gw_executive_board_members (user_id, position, is_active, created_at, updated_at)
VALUES ('3cfbce45-a387-4a4c-9567-c98cd87c097a', 'alumnae_liaison', true, now(), now());

-- Update her profile to reflect executive board status
UPDATE gw_profiles 
SET is_exec_board = true, updated_at = now()
WHERE user_id = '3cfbce45-a387-4a4c-9567-c98cd87c097a';