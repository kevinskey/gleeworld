

## Backfill Glee Cam Photos with Course ID

### Problem
All 37 existing approved Glee Cam photos have `course_id = NULL`. The `GleeCamCard` component filters by `course_id` when viewing a course page, so these photos are invisible on course-specific sliders (e.g., MUS 070).

### Solution

**1. Data Backfill** -- Assign all existing photos to MUS 070 (Glee Club)

Update all 37 approved image records in `quick_capture_media` that have `course_id IS NULL` to use the MUS 070 course UUID (`a0000000-0000-0000-0000-000000000070`). These are all Glee Club member photos, so this is the correct association.

```sql
UPDATE quick_capture_media
SET course_id = 'a0000000-0000-0000-0000-000000000070'
WHERE file_type LIKE 'image/%'
  AND is_approved = true
  AND course_id IS NULL;
```

**2. Add Fallback Logic to GleeCamCard** -- Show general photos when no course-specific ones exist

Modify `src/components/dashboard/GleeCamCard.tsx` so that when viewing a course page and no course-tagged photos are found, it falls back to showing general (non-course-tagged) photos. This prevents empty sliders for courses that haven't accumulated their own photos yet.

The change is in the `fetchPhotos` function: after querying with the `course_id` filter, if zero results come back, re-query without the filter.

### Technical Details

- **File changed**: `src/components/dashboard/GleeCamCard.tsx` (fallback query logic)
- **Data update**: 37 rows in `quick_capture_media` via the data insert tool
- No schema changes needed; the `course_id` column already exists

