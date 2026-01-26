
# Plan: Link 55 MUS-070 Enrollments to User Accounts

## Summary
Update 55 `gw_course_enrollments` records that are missing `user_id` by matching them to existing user accounts in `gw_profiles` via name comparison through the intermediate `gw_student_profiles` table.

## Current State
| Metric | Count |
|--------|-------|
| Total MUS-070 enrollments missing `user_id` | 55 |
| Can match automatically by name pattern | 48 |
| Require special handling (name variations) | 7 |

## Data Flow
```text
gw_course_enrollments.student_profile_id 
    → gw_student_profiles.id (name: "Last, First M.")
    → Match to gw_profiles.full_name ("First Last")
    → Get gw_profiles.user_id
    → Update gw_course_enrollments.user_id
```

## Implementation Steps

### Step 1: Automatic Name Matching (48 students)
Create a SQL migration that:
1. Parses `gw_student_profiles.full_name` from "Last, First M." format
2. Matches to `gw_profiles.full_name` using pattern: `first_name%last_name`
3. Updates `gw_course_enrollments.user_id` with the matched `gw_profiles.user_id`

### Step 2: Manual Edge Case Handling (7 students)
Handle students with name format variations:

| Student Profile Name | gw_profiles Name | Issue |
|---------------------|------------------|-------|
| Coleman, Kaylen A. | Coleman | Incomplete profile name |
| Dent, Charity J. | Charity Dent | Trailing space |
| Henderson, Kennedi J. | Kennedi | First name only |
| Johnson, Michelle A. | Michelle Abigail Johnson | Extra middle name |
| Nashe, Shelby A. | Shelbynashe@gmail.com | Email as name |
| Petty, T'yara I. | Tyara Petty | Apostrophe removed |
| Williams, Ainka-Amara M. | AinkaAmara Williams | Hyphen removed |

### Step 3: Backfill Attendance Records
After linking, insert attendance records for the newly-linked students for sessions before January 28th (matching existing behavior).

### Step 4: Update `gw_student_profiles.user_id`
Also update the `gw_student_profiles` table with the matched `user_id` to maintain data consistency.

---

## Technical Details

### Migration SQL Structure

```sql
-- Part 1: Automatic matching for 48 students
WITH matched_enrollments AS (
  SELECT DISTINCT ON (e.id)
    e.id as enrollment_id,
    p.user_id
  FROM gw_course_enrollments e
  JOIN gw_student_profiles sp ON e.student_profile_id = sp.id
  JOIN gw_profiles p ON p.full_name ILIKE 
    TRIM(REGEXP_REPLACE(SPLIT_PART(sp.full_name, ',', 2), '\s+[A-Z]\.?$', '')) 
    || '%' 
    || TRIM(SPLIT_PART(sp.full_name, ',', 1))
  WHERE e.course_id = 'a0000000-0000-0000-0000-000000000070'
    AND e.user_id IS NULL
    AND p.user_id IS NOT NULL
)
UPDATE gw_course_enrollments e
SET user_id = m.user_id
FROM matched_enrollments m
WHERE e.id = m.enrollment_id;

-- Part 2: Manual matching for 7 edge cases
UPDATE gw_course_enrollments e
SET user_id = CASE
  WHEN sp.full_name = 'Coleman, Kaylen A.' THEN '20335166-9e72-4d98-a7a8-265d9d5e8887'
  WHEN sp.full_name = 'Dent, Charity J.' THEN '6d44a9d0-70df-4a74-9623-002f4365253c'
  WHEN sp.full_name = 'Henderson, Kennedi J.' THEN '763aee24-4e37-49a3-9e8b-6539ce6360a9'
  WHEN sp.full_name = 'Johnson, Michelle A.' THEN 'c5b54bf0-30cf-4f72-9ad6-e11005565426'
  WHEN sp.full_name = 'Nashe, Shelby A.' THEN '5e6e5171-dc0b-418c-9b5f-236b05990dd0'
  WHEN sp.full_name = 'Petty, T''yara I.' THEN '799ae001-0cd5-438d-87f2-1cbf5434ddf0'
  WHEN sp.full_name = 'Williams, Ainka-Amara M.' THEN '04f14d47-25ba-4632-9d4e-2407d2c3797b'
END
FROM gw_student_profiles sp
WHERE e.student_profile_id = sp.id
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.user_id IS NULL;

-- Part 3: Update gw_student_profiles with user_id for consistency
UPDATE gw_student_profiles sp
SET user_id = e.user_id
FROM gw_course_enrollments e
WHERE e.student_profile_id = sp.id
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.user_id IS NOT NULL
  AND sp.user_id IS NULL;

-- Part 4: Backfill attendance for newly-linked students
INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, note)
SELECT s.id, e.user_id, 'present', 'manual', 'Retroactive attendance - backfilled after enrollment link'
FROM gw_attendance_sessions s
CROSS JOIN gw_course_enrollments e
WHERE s.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.user_id IS NOT NULL
  AND s.opens_at::date < '2026-01-28'
ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;
```

## Expected Outcome
After implementation:
- All 79 MUS-070 enrolled students will have `user_id` values
- The attendance grid will display all 79 students instead of 24
- Attendance records will be backfilled for all newly-linked students

## Files to Create/Modify
| File | Action |
|------|--------|
| `supabase/migrations/[timestamp]_link_mus070_enrollments.sql` | Create new migration |

## Verification Query
After running, verify with:
```sql
SELECT COUNT(*) as linked, 
       (SELECT COUNT(*) FROM gw_course_enrollments 
        WHERE course_id = 'a0000000-0000-0000-0000-000000000070' 
        AND user_id IS NULL) as still_unlinked
FROM gw_course_enrollments 
WHERE course_id = 'a0000000-0000-0000-0000-000000000070' 
  AND user_id IS NOT NULL;
```
Expected: linked = 79, still_unlinked = 0
