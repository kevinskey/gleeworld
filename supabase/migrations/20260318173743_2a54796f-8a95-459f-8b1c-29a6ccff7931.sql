ALTER TABLE public.dm_messages
ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_size bigint;

COMMENT ON COLUMN public.dm_messages.message_type IS 'Message content type: text, image, file, audio';
COMMENT ON COLUMN public.dm_messages.file_url IS 'Public URL for uploaded attachment';
COMMENT ON COLUMN public.dm_messages.file_name IS 'Original uploaded attachment filename';
COMMENT ON COLUMN public.dm_messages.file_size IS 'Uploaded attachment size in bytes';