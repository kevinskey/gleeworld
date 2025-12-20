-- Delete videos that are NOT from the official Spelman College Glee Club channel
DELETE FROM youtube_videos 
WHERE channel_id != '50a35caf-d24e-4f4f-8c3f-43903f106aad';

-- Also delete the non-Glee Club channel record
DELETE FROM youtube_channels 
WHERE channel_id != 'UCK7x9GxnHNiw4H82upcxmcw';