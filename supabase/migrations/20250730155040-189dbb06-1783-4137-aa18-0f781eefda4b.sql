-- Add canvas_data field to store Fabric.js canvas state for marked scores
ALTER TABLE public.gw_marked_scores 
ADD COLUMN canvas_data TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.gw_marked_scores.canvas_data IS 'JSON string containing Fabric.js canvas state for annotations';