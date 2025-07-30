-- Check existing storage buckets
SELECT id, name, public, created_at FROM storage.buckets ORDER BY created_at;