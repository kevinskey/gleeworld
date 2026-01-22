-- Delete placeholder video entries with fake video IDs
DELETE FROM youtube_channel_videos 
WHERE video_id LIKE 'YOUR_VIDEO_ID%';