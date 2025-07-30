-- Add applicant_picture_url field to gw_audition_logs table
ALTER TABLE public.gw_audition_logs 
ADD COLUMN applicant_picture_url text;

-- Add comment to explain the field
COMMENT ON COLUMN public.gw_audition_logs.applicant_picture_url 
IS 'URL to the applicant''s uploaded picture/headshot';