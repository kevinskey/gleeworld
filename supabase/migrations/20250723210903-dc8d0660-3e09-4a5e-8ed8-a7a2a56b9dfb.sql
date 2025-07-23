-- Add physical copy tracking to sheet music
ALTER TABLE public.gw_sheet_music 
ADD COLUMN physical_copies_count integer DEFAULT 0,
ADD COLUMN physical_location text,
ADD COLUMN condition_notes text,
ADD COLUMN last_inventory_date date,
ADD COLUMN isbn_barcode text,
ADD COLUMN publisher text,
ADD COLUMN copyright_year integer,
ADD COLUMN purchase_date date,
ADD COLUMN purchase_price numeric(10,2),
ADD COLUMN donor_name text,
ADD COLUMN notes text;

-- Create library inventory tracking table
CREATE TABLE public.library_inventory_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL,
  created_by UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_items_scanned INTEGER DEFAULT 0,
  notes TEXT
);

-- Create individual inventory entries
CREATE TABLE public.library_inventory_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.library_inventory_sessions(id) ON DELETE CASCADE,
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  physical_condition TEXT CHECK (physical_condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  copies_found INTEGER DEFAULT 0,
  location_found TEXT,
  notes TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scanned_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.library_inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_inventory_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory sessions (Librarians and admins only)
CREATE POLICY "Librarians and admins can manage inventory sessions"
ON public.library_inventory_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for inventory entries (Librarians and admins only)  
CREATE POLICY "Librarians and admins can manage inventory entries"
ON public.library_inventory_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create function to update inventory date when physical copies are updated
CREATE OR REPLACE FUNCTION update_inventory_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_inventory_date when physical_copies_count changes
  IF OLD.physical_copies_count IS DISTINCT FROM NEW.physical_copies_count THEN
    NEW.last_inventory_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic inventory date updates
CREATE TRIGGER update_sheet_music_inventory_date
  BEFORE UPDATE ON public.gw_sheet_music
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_date();