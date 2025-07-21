-- Create setlists table
CREATE TABLE public.setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  performance_date DATE,
  venue TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create setlist_items table for linking sheet music to setlists
CREATE TABLE public.setlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL,
  sheet_music_id UUID NOT NULL,
  position INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (setlist_id) REFERENCES public.setlists(id) ON DELETE CASCADE,
  FOREIGN KEY (sheet_music_id) REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for setlists
CREATE POLICY "Users can view their own setlists" 
ON public.setlists 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own setlists" 
ON public.setlists 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own setlists" 
ON public.setlists 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own setlists" 
ON public.setlists 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create RLS policies for setlist_items
CREATE POLICY "Users can view items in their setlists" 
ON public.setlist_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.setlists 
  WHERE setlists.id = setlist_items.setlist_id 
  AND setlists.created_by = auth.uid()
));

CREATE POLICY "Users can create items in their setlists" 
ON public.setlist_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.setlists 
  WHERE setlists.id = setlist_items.setlist_id 
  AND setlists.created_by = auth.uid()
));

CREATE POLICY "Users can update items in their setlists" 
ON public.setlist_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.setlists 
  WHERE setlists.id = setlist_items.setlist_id 
  AND setlists.created_by = auth.uid()
));

CREATE POLICY "Users can delete items from their setlists" 
ON public.setlist_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.setlists 
  WHERE setlists.id = setlist_items.setlist_id 
  AND setlists.created_by = auth.uid()
));

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setlist_items_updated_at
  BEFORE UPDATE ON public.setlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();