-- Allow 'audio' category in mus240_resources
ALTER TABLE public.mus240_resources
  DROP CONSTRAINT IF EXISTS mus240_resources_category_check;

ALTER TABLE public.mus240_resources
  ADD CONSTRAINT mus240_resources_category_check
  CHECK (category = ANY (ARRAY['reading','website','video','article','database','audio']));