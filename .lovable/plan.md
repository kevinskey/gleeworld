

# Plan: Fix Student View Data Issues for MUS-240

## Overview
Clean up legacy test data and verify the student assignment/discussion display is accurate with proper due dates.

---

## Issues Identified

### 1. Test Assignment in Legacy Table
A test entry exists in `mus240_assignments` that would appear to enrolled students:
- Title: "test"
- Due: Jan 14, 2026
- Points: 100

### 2. Due Date Synchronization
Discussion due dates in `course_discussions` may not match the phased `individual_due_at` values in `discussion_prompts`. Currently showing dates like "Jan 25, 2026 5:20 PM" for discussions that should have different phased deadlines.

---

## Implementation Steps

### Step 1: Clean Up Test Assignment Data
Delete the test entry from the legacy assignments table:

```sql
DELETE FROM mus240_assignments 
WHERE title = 'test'
AND course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';
```

### Step 2: Sync Discussion Due Dates (Optional)
If the `course_discussions.due_date` should reflect phased deadlines from `discussion_prompts`, update to use `individual_due_at`:

```sql
UPDATE course_discussions cd
SET due_date = dp.individual_due_at
FROM discussion_prompts dp
WHERE cd.id = dp.id
AND cd.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND dp.individual_due_at IS NOT NULL;
```

### Step 3: Verify Enrolled Student View
Test the student view by:
1. Logging in as an enrolled student
2. Navigating to `/academy/mus-240`
3. Confirming Assignments tab shows 3 essays + 15 journals (after cleanup)
4. Confirming Discussions tab shows all 16 discussions with correct due dates

---

## Files to Modify

| Change Type | Location | Description |
|-------------|----------|-------------|
| Database | `mus240_assignments` | Remove test entry |
| Database | `course_discussions` | (Optional) Sync due dates with phased system |

---

## Current State Summary

| Component | Status | Details |
|-----------|--------|---------|
| **Discussions** | ✅ Working | 16 discussions visible with due dates |
| **Assignments** | ✅ Working | Enrollment gate functioning correctly |
| **Data Accuracy** | ⚠️ Needs cleanup | 1 test entry to remove |

---

## Technical Notes

- The `CourseAssignments` component correctly queries both `gw_course_assignments` AND `mus240_assignments` for MUS-240
- The `DiscussionsSection` component fetches from `course_discussions` and displays `due_date` with appropriate badges
- Enrollment verification uses `gw_course_enrollments` with fallback to `mus240_enrollments` for legacy compatibility
- All due date displays use `date-fns` formatting with proper timezone handling

