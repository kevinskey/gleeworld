

# Performance Grades Entry Interface for MUS 070

## Current Problem
You've just defined a tiered performance weighting system where the 30% "Performances" category is broken down into specific events:
- Spring Concert: 10%
- Graduation/Commencement: 5%
- Founders Day: 4%
- TBD Performance 1: 5.5%
- TBD Performance 2: 5.5%

However, **there is no interface for the secretary or instructor to enter grades for these individual performances**. The existing `Mus070GradeSpreadsheet` only allows editing a single aggregate "Performances" percentage (50% weight under an older schema), not the individual events.

---

## Proposed Solution

Build a **Performance Grade Entry** interface that:
1. Lists all enrolled students
2. Provides columns for each performance event (Spring Concert, Founders Day, etc.)
3. Allows the secretary/instructor to mark:
   - **Participated** (full credit)
   - **Excused** (no penalty)
   - **Absent** (zero credit for that performance weight)
4. Persists grades to the database (`gw_grades` or a new `gw_performance_grades` table)
5. Integrates with the student grade view so deductions calculate automatically

---

## Implementation Approach

### 1. Database Schema
Create a new table `gw_performance_grades` to track individual performance participation:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| student_profile_id | UUID | FK to gw_profiles |
| course_id | UUID | FK to gw_courses |
| performance_name | VARCHAR | e.g., "Spring Concert" |
| performance_date | DATE | Event date |
| status | VARCHAR | 'participated', 'excused', 'absent' |
| notes | TEXT | Optional notes |
| graded_by | UUID | FK to auth.users |
| graded_at | TIMESTAMP | When marked |

### 2. New Component: `PerformanceGradeEntry`
Located at `src/components/mus070/instructor/PerformanceGradeEntry.tsx`

Features:
- Grid view with student rows and performance columns
- Status picker (Participated / Excused / Absent) for each cell
- Batch operations ("Mark all as Participated")
- Auto-save on change
- Permission check (admin, super_admin, or secretary only)

### 3. Integration Points

**A. Add to Grades Admin Tabs**
Update `Mus070GradesAdmin.tsx` and `CourseGradesAdmin.tsx` to include a "Performances" tab:
```
Tabs: [Grade Spreadsheet] [Attendance] [Performances] [Roster]
```

**B. Update Student Grade Calculation**
Modify `StudentGradeSpreadsheet.tsx` to:
1. Fetch performance grades from the new table
2. Calculate deductions based on absences
3. Show actual status for each performance (vs. "Pending")

**C. Update Instructor Console**
The Course Instructor Console already uses `CourseGradesAdmin`, so the new tab will appear automatically.

---

## User Experience

**Secretary/Instructor Workflow:**
1. Navigate to MUS 070 → Instructor Console → Grades
2. Click "Performances" tab
3. See grid with all students and 5 performance columns
4. Click a cell to toggle status (Participated → Excused → Absent)
5. Changes save automatically
6. After a performance, use "Batch Mark All Present" if most attended

**Student View:**
Students will see their performance status in the grade breakdown:
- Spring Concert: ✓ Participated (0% deduction)
- Founders Day: — Pending
- TBD Performance 1: ✗ Absent (-5.5% deduction)

---

## Technical Details

### Files to Create
- `supabase/migrations/xxx_create_performance_grades.sql` - Database table
- `src/components/mus070/instructor/PerformanceGradeEntry.tsx` - Entry interface
- `src/hooks/usePerformanceGrades.ts` - Data hook for CRUD operations

### Files to Modify
- `src/components/mus070/instructor/GradesAdmin.tsx` - Add Performances tab
- `src/components/course/CourseGradesAdmin.tsx` - Add Performances tab for MUS 070
- `src/components/grading/student/StudentGradeSpreadsheet.tsx` - Fetch and display performance grades
- `supabase/functions/glee-assistant/index.ts` - Update AI knowledge base

### RLS Policies Required
- Students can SELECT their own records
- Admin/super_admin/secretary can INSERT/UPDATE/DELETE all records

---

## Alternative: Simpler Approach

If you prefer a quicker implementation:
1. Use the existing `gw_course_assignments` table
2. Create 5 assignments (one per performance) with matching point values
3. Secretary grades each "assignment" as 100% or 0%
4. Existing gradebook infrastructure handles the rest

This approach requires no new tables but loses some clarity around "performance participation" vs. "assignment submission."

---

## Recommended Next Step

Build the dedicated **PerformanceGradeEntry** component with proper database backing. This creates a clear, purpose-built interface that matches how performance grades are conceptually different from assignments or attendance.

