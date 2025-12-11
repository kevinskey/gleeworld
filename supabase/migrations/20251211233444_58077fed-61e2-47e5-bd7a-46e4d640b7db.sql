-- Clean up stale video sessions that are still marked as active
UPDATE gw_video_sessions 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'active' AND started_at < NOW() - INTERVAL '1 hour';