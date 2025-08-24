-- Remove test/mock data from sight reading studio
DELETE FROM gw_scores WHERE notes ILIKE '%practice (offline)%' OR notes ILIKE '%test%';
DELETE FROM gw_sheet_music WHERE title ILIKE '%test%' OR title ILIKE '%mock%' OR title ILIKE '%sample%' OR title ILIKE '%example%' OR title ILIKE '%xml test%';