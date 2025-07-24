-- Phase 2B: Advanced Learning and Rehearsal Tools

-- 1. Composer/Conductor Notes
CREATE TABLE public.gw_sheet_music_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('conductor', 'composer', 'section_leader')),
  note_type TEXT NOT NULL CHECK (note_type IN ('historical', 'interpretive', 'rehearsal')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Section Leader Marked Scores
CREATE TABLE public.gw_marked_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL,
  voice_part TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Personal Annotations (Private User Notes)
CREATE TABLE public.gw_personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Rehearsal Linking
CREATE TABLE public.gw_rehearsal_music_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.gw_events(id) ON DELETE CASCADE,
  music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, music_id)
);

-- Add archive functionality to existing sheet music table
ALTER TABLE public.gw_sheet_music 
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN archived_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN archive_reason TEXT;

-- Enable RLS on all new tables
ALTER TABLE public.gw_sheet_music_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_marked_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_personal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_rehearsal_music_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_sheet_music_notes
CREATE POLICY "Users can view notes for accessible music" 
ON public.gw_sheet_music_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_sheet_music sm
    WHERE sm.id = gw_sheet_music_notes.music_id
    AND user_can_access_sheet_music(sm.id, auth.uid())
  )
);

CREATE POLICY "Users can create notes" 
ON public.gw_sheet_music_notes 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own notes" 
ON public.gw_sheet_music_notes 
FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all notes" 
ON public.gw_sheet_music_notes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- RLS Policies for gw_marked_scores
CREATE POLICY "Users can view marked scores for their voice part" 
ON public.gw_marked_scores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_sheet_music sm
    WHERE sm.id = gw_marked_scores.music_id
    AND user_can_access_sheet_music(sm.id, auth.uid())
  )
  AND (
    voice_part = ANY(
      SELECT unnest(sm.voice_parts) FROM public.gw_sheet_music sm 
      WHERE sm.id = gw_marked_scores.music_id
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
    )
  )
);

CREATE POLICY "Section leaders can upload marked scores" 
ON public.gw_marked_scores 
FOR INSERT 
WITH CHECK (
  auth.uid() = uploader_id
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role IN ('admin', 'executive', 'member') OR p.is_admin = true OR p.is_super_admin = true)
  )
);

CREATE POLICY "Uploaders can update their marked scores" 
ON public.gw_marked_scores 
FOR UPDATE 
USING (auth.uid() = uploader_id);

-- RLS Policies for gw_personal_notes (completely private)
CREATE POLICY "Users can manage their own personal notes" 
ON public.gw_personal_notes 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for gw_rehearsal_music_links
CREATE POLICY "Members can view rehearsal music links" 
ON public.gw_rehearsal_music_links 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage rehearsal music links" 
ON public.gw_rehearsal_music_links 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_gw_sheet_music_notes_updated_at
  BEFORE UPDATE ON public.gw_sheet_music_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_personal_notes_updated_at
  BEFORE UPDATE ON public.gw_personal_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_gw_sheet_music_notes_music_id ON public.gw_sheet_music_notes(music_id);
CREATE INDEX idx_gw_sheet_music_notes_author_id ON public.gw_sheet_music_notes(author_id);
CREATE INDEX idx_gw_marked_scores_music_id ON public.gw_marked_scores(music_id);
CREATE INDEX idx_gw_marked_scores_voice_part ON public.gw_marked_scores(voice_part);
CREATE INDEX idx_gw_personal_notes_user_music ON public.gw_personal_notes(user_id, music_id);
CREATE INDEX idx_gw_rehearsal_music_links_event ON public.gw_rehearsal_music_links(event_id);
CREATE INDEX idx_gw_sheet_music_archived ON public.gw_sheet_music(is_archived);

-- Storage bucket for marked scores (non-public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marked-scores', 'marked-scores', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for marked scores
CREATE POLICY "Users can view marked scores they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'marked-scores' 
  AND EXISTS (
    SELECT 1 FROM public.gw_marked_scores ms
    WHERE ms.file_url LIKE '%' || name
    AND EXISTS (
      SELECT 1 FROM public.gw_sheet_music sm
      WHERE sm.id = ms.music_id
      AND user_can_access_sheet_music(sm.id, auth.uid())
    )
  )
);

CREATE POLICY "Section leaders can upload marked scores"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marked-scores'
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role IN ('admin', 'executive', 'member') OR p.is_admin = true OR p.is_super_admin = true)
  )
);