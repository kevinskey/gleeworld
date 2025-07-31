-- Update existing audition log records to include photos from original auditions
UPDATE gw_audition_logs 
SET applicant_picture_url = gw_auditions.selfie_url
FROM gw_auditions 
WHERE gw_audition_logs.audition_id = gw_auditions.id 
AND gw_audition_logs.applicant_picture_url IS NULL
AND gw_auditions.selfie_url IS NOT NULL;