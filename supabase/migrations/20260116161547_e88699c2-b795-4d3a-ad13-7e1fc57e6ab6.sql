-- Add external provider tracking columns to gw_radio_channels
ALTER TABLE public.gw_radio_channels 
ADD COLUMN IF NOT EXISTS external_provider text,
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS hls_url text;

-- Create unique constraint for upsert by (external_provider, external_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gw_radio_channels_external 
ON public.gw_radio_channels (external_provider, external_id) 
WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;