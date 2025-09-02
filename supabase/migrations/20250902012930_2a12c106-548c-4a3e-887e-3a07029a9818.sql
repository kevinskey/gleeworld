-- Ensure all journal entries are updated to use UUID assignment_ids
UPDATE mus240_journal_entries 
SET assignment_id = '550e8400-e29b-41d4-a716-446655440000'::uuid 
WHERE assignment_id = 'lj1' OR assignment_id = 'lj1'::text;

UPDATE mus240_journal_entries 
SET assignment_id = '550e8400-e29b-41d4-a716-446655440001'::uuid 
WHERE assignment_id = 'lj2' OR assignment_id = 'lj2'::text;

-- Force refresh any cached data by updating timestamps
UPDATE mus240_journal_entries 
SET updated_at = now() 
WHERE assignment_id IN ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');