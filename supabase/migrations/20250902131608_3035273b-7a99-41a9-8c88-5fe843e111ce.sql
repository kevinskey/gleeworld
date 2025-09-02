-- Fix the broken Jubilee Quartets PDF URL
-- Since the file doesn't exist in storage, let's mark it as inactive for now
UPDATE mus240_resources 
SET is_active = false,
    updated_at = now()
WHERE title ILIKE '%jubilee%' AND url ILIKE '%1756818676671-obm0qh-Jubilee_Quartets.pdf%';

-- Add a note in the description about the missing file
UPDATE mus240_resources 
SET description = COALESCE(description, '') || ' [Note: Original PDF file needs to be re-uploaded]'
WHERE title ILIKE '%jubilee%' AND is_active = false;