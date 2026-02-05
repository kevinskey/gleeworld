

# Fix Course Module Active Status Detection

## Problem
The course modules page is showing multiple modules as "current" because:
1. Weeks 1, 2, and 3 all have `is_active: true` in the database
2. The current code uses the boolean flag as the primary source, only falling back to date-based detection when the flag is `false`
3. This means old weeks that were manually marked active stay marked active

## Solution
Two-part fix to ensure only the truly current week is marked active:

---

### Part 1: Fix the Code Logic
Change the active status detection to use **date-based calculation as the primary method** when dates are available:

**Current logic (lines 173-179):**
```typescript
let isActive = mod.is_active;
if (!isActive && mod.start_date && mod.end_date) {
  // Only check dates if flag is false
}
```

**New logic:**
```typescript
// If dates exist, always use date-based detection (more reliable)
let isActive = false;
if (mod.start_date && mod.end_date) {
  const startDate = new Date(mod.start_date);
  const endDate = new Date(mod.end_date);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  isActive = today >= startDate && today <= endDate;
} else {
  // Fall back to boolean flag only if no dates
  isActive = mod.is_active;
}
```

---

### Part 2: Clean Up Database (One-time fix)
Update stale `is_active` flags in the database so the data is consistent:

```sql
-- Fix mus240_module_settings
UPDATE mus240_module_settings 
SET is_active = (CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date);

-- Fix gw_course_modules for MUS-240
UPDATE gw_course_modules 
SET is_active = (CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date)
WHERE course_id IN (SELECT id FROM gw_courses WHERE course_code = 'MUS 240');
```

---

## Result After Fix
- **Week 3 (Blues: From Delta to Urban)** will be the only module marked "Current" and pinned to the top
- Weeks 1 and 2 will sort below Week 3 (in descending order: 2, then 1)
- Future weeks will be shown after past weeks

---

## Files to Modify
| File | Change |
|------|--------|
| `src/components/academy/CourseModulesSheet.tsx` | Prioritize date-based active detection over boolean flag |
| Database migration | Clean up stale `is_active` values |

