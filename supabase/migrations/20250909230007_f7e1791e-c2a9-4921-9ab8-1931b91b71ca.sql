-- Add the missing is_pinned column to gw_module_ordering table
ALTER TABLE public.gw_module_ordering 
ADD COLUMN is_pinned BOOLEAN DEFAULT false;