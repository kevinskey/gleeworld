-- Add library link columns to liturgical_music_plan
-- sheet_music_id can reference scores with PDFs OR MusicXML (xml_content)
ALTER TABLE public.liturgical_music_plan
ADD COLUMN IF NOT EXISTS sheet_music_id uuid REFERENCES public.gw_sheet_music(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS media_id uuid REFERENCES public.gw_media_library(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_liturgical_music_plan_sheet_music ON public.liturgical_music_plan(sheet_music_id) WHERE sheet_music_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_liturgical_music_plan_media ON public.liturgical_music_plan(media_id) WHERE media_id IS NOT NULL;