
-- Tour notes for real-time status updates from exec board and tour managers
CREATE TABLE public.gw_tour_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  city_id UUID REFERENCES public.gw_tour_cities(id) ON DELETE SET NULL,
  city_name TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_tour_notes ENABLE ROW LEVEL SECURITY;

-- Exec board and tour managers can view all notes
CREATE POLICY "Tour managers and exec board can view notes"
ON public.gw_tour_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (role IN ('admin', 'super_admin') OR is_exec_board = true)
  )
);

-- Exec board and tour managers can create notes
CREATE POLICY "Tour managers and exec board can create notes"
ON public.gw_tour_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (role IN ('admin', 'super_admin') OR is_exec_board = true)
  )
);

-- Authors can update their own notes, admins can update any
CREATE POLICY "Authors and admins can update notes"
ON public.gw_tour_notes FOR UPDATE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Authors and admins can delete
CREATE POLICY "Authors and admins can delete notes"
ON public.gw_tour_notes FOR DELETE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_tour_notes;

-- Indexes
CREATE INDEX idx_tour_notes_category ON public.gw_tour_notes(category);
CREATE INDEX idx_tour_notes_created ON public.gw_tour_notes(created_at DESC);
CREATE INDEX idx_tour_notes_pinned ON public.gw_tour_notes(is_pinned) WHERE is_pinned = true;

-- Trigger for updated_at
CREATE TRIGGER update_gw_tour_notes_updated_at
BEFORE UPDATE ON public.gw_tour_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
