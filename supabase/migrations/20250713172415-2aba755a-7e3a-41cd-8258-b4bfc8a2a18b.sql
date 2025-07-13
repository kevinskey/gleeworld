-- Create setlists table
CREATE TABLE public.setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  performance_date DATE,
  venue TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false
);

-- Create setlist_items table for ordering sheet music in setlists
CREATE TABLE public.setlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setlist_id, position),
  UNIQUE(setlist_id, sheet_music_id)
);

-- Enable RLS
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for setlists
CREATE POLICY "Users can create their own setlists"
ON public.setlists
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view their own setlists"
ON public.setlists
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can view public setlists"
ON public.setlists
FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can update their own setlists"
ON public.setlists
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own setlists"
ON public.setlists
FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for setlist_items
CREATE POLICY "Users can manage items in their own setlists"
ON public.setlist_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.setlists 
  WHERE setlists.id = setlist_items.setlist_id 
  AND setlists.created_by = auth.uid()
));

CREATE POLICY "Users can view items in public setlists"
ON public.setlist_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.setlists 
  WHERE setlists.id = setlist_items.setlist_id 
  AND setlists.is_public = true
));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_setlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_setlists_updated_at();