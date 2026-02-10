-- Add specific_date column for date-specific (non-recurring) availability
ALTER TABLE gw_provider_availability 
ADD COLUMN specific_date date DEFAULT NULL;

-- Make day_of_week nullable so date-specific entries don't need it
ALTER TABLE gw_provider_availability 
ALTER COLUMN day_of_week DROP NOT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN gw_provider_availability.specific_date IS 'When set, this availability applies only to this specific date (not recurring). day_of_week is ignored.';