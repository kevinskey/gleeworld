-- Clear all video session related data for a fresh start
DELETE FROM gw_video_session_chat;
DELETE FROM gw_video_session_participants;
DELETE FROM gw_video_sessions;
DELETE FROM gw_live_session_invites;