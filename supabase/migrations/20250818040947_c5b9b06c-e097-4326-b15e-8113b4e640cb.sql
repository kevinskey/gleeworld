-- Add missing columns for physical score management to gw_sheet_music table
ALTER TABLE public.gw_sheet_music 
ADD COLUMN IF NOT EXISTS voicing TEXT,
ADD COLUMN IF NOT EXISTS physical_copies_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS physical_location TEXT,
ADD COLUMN IF NOT EXISTS condition_notes TEXT,
ADD COLUMN IF NOT EXISTS last_inventory_date DATE,
ADD COLUMN IF NOT EXISTS isbn_barcode TEXT,
ADD COLUMN IF NOT EXISTS publisher TEXT,
ADD COLUMN IF NOT EXISTS copyright_year INTEGER,
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS donor_name TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create an index for physical location lookups
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_physical_location ON public.gw_sheet_music(physical_location);

-- Create an index for inventory management
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_inventory ON public.gw_sheet_music(last_inventory_date) WHERE physical_copies_count > 0;

-- Create a trigger to update last_inventory_date when physical_copies_count changes
CREATE OR REPLACE FUNCTION public.update_inventory_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_inventory_date when physical_copies_count changes
  IF OLD.physical_copies_count IS DISTINCT FROM NEW.physical_copies_count THEN
    NEW.last_inventory_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_inventory_date ON public.gw_sheet_music;
CREATE TRIGGER trigger_update_inventory_date
  BEFORE UPDATE ON public.gw_sheet_music
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_date();