-- Add sample sheet music data for testing migration
INSERT INTO public.gw_sheet_music (
  title, composer, arranger, pdf_url, thumbnail_url, 
  voice_parts, difficulty_level, language, created_by, is_public
) VALUES 
  ('Amazing Grace', 'John Newton', 'Traditional', 
   'https://example.com/amazing-grace.pdf', 
   'https://example.com/amazing-grace-thumb.jpg',
   ARRAY['Soprano', 'Alto', 'Tenor', 'Bass'], 
   'Beginner', 'English', 
   (SELECT id FROM public.gw_profiles LIMIT 1), 
   true),
  ('Ave Maria', 'Franz Schubert', 'Traditional', 
   'https://example.com/ave-maria.pdf', 
   'https://example.com/ave-maria-thumb.jpg',
   ARRAY['Soprano', 'Alto'], 
   'Intermediate', 'Latin', 
   (SELECT id FROM public.gw_profiles LIMIT 1), 
   true),
  ('Hallelujah Chorus', 'George Frideric Handel', 'Traditional', 
   'https://example.com/hallelujah.pdf', 
   'https://example.com/hallelujah-thumb.jpg',
   ARRAY['Soprano', 'Alto', 'Tenor', 'Bass'], 
   'Advanced', 'English', 
   (SELECT id FROM public.gw_profiles LIMIT 1), 
   true);