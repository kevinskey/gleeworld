-- Update old UUID-based assignment_ids to new legacy_id format
-- Based on the pattern, 550e8400-e29b-41d4-a716-446655440000 should be lj12
UPDATE mus240_journal_entries
SET assignment_id = 'lj12'
WHERE assignment_id = '550e8400-e29b-41d4-a716-446655440000';

-- Update the second UUID to lj13
UPDATE mus240_journal_entries
SET assignment_id = 'lj13'
WHERE assignment_id = '550e8400-e29b-41d4-a716-446655440001';