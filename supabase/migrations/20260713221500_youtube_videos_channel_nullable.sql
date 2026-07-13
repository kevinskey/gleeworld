-- Ad-hoc videos (e.g. added by the GleeWorld Assistant's add_video tool, or a
-- manual paste) aren't from a channel the tenant follows. Requiring a
-- youtube_channels FK meant a video could never be saved on a tenant with no
-- channels — which is every tenant (youtube_channels is empty), so the Videos
-- feature never worked. Make the channel optional; a null channel_id video
-- still renders on /youtube (no channel filter there).
ALTER TABLE public.youtube_videos ALTER COLUMN channel_id DROP NOT NULL;
