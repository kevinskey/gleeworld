-- Clean up any remaining assignment test/mock data
DELETE FROM assignment_submissions WHERE file_name ILIKE '%test%' OR file_name ILIKE '%mock%' OR file_name ILIKE '%sample%' OR file_name ILIKE '%example%';
DELETE FROM music_fundamentals_assignments WHERE title ILIKE '%test%' OR title ILIKE '%mock%' OR title ILIKE '%sample%' OR title ILIKE '%example%';
DELETE FROM gw_assignment_submissions WHERE recording_id ILIKE '%test%' OR notes ILIKE '%test%' OR notes ILIKE '%mock%';
DELETE FROM gw_sight_reading_assignments WHERE title ILIKE '%test%' OR title ILIKE '%mock%' OR title ILIKE '%sample%' OR title ILIKE '%example%';