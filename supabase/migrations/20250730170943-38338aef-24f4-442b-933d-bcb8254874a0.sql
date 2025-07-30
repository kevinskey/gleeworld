-- Add crop_recommendations column to gw_sheet_music table
ALTER TABLE public.gw_sheet_music ADD COLUMN crop_recommendations JSONB;