-- Unpublish Appendix D from handbook since content is now in Elections Module
UPDATE public.handbook_appendices
SET is_published = false
WHERE slug = 'appendix-d-shadowing' AND course_id = 'MUS070';