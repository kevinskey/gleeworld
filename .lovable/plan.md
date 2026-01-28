
# Expanding Glee Assistant: Instructor Communications & Grade Queries

## Overview

You want the assistant to help instructors with two key capabilities:

1. **Send emails to students** - Email individual students or groups about grades, assignments, attendance, etc.
2. **Query student grades** - Ask questions like "What grade is Kevin Johnson getting?" or "List Kevin Johnson's transcripts"

The existing `get_student_grades` tool already queries grades, but I'll enhance it to be smarter about finding students by name and generating more comprehensive "transcript-like" reports.

---

## What You'll Be Able to Say

**Email Students:**
- "Email Kevin Johnson about his missing journal"
- "Send an email to all students who haven't submitted journals"  
- "Tell Maya Brown her midterm grade is ready"
- "Send a grade update to the whole class"

**Query Grades:**
- "What grade is Kevin Johnson getting in my class?"
- "List Kevin Johnson's transcripts" (shows all assignments, journals, midterm, participation)
- "Show me Maya's grade breakdown"
- "Who has an A in MUS-240?"
- "Which students are failing?"

---

## Implementation Plan

### New Tool: `send_student_email`

A dedicated tool for instructors to email students directly through the assistant:

```text
send_student_email
├── student_name: "Kevin Johnson" (or "all", "class")
├── subject: "Your Midterm Grade"
├── message: "Great work on the midterm..."
├── include_grade: true/false (auto-include current grade summary)
├── course_code: "MUS-240" (defaults to instructor's course)
```

### Enhanced: `get_student_grades` → `get_student_record`

Upgrade the existing tool to provide comprehensive "transcript" information:

```text
get_student_record
├── student_name: "Kevin Johnson"
├── course_code: "MUS-240"
├── include_journals: true (detailed journal breakdown)
├── include_midterm: true (midterm score + question details)
├── include_attendance: true (present/absent count)
├── include_participation: true (poll responses, discussions)
├── format: "summary" | "detailed" | "transcript"
```

---

## Technical Details

### Files to Modify

**`supabase/functions/glee-assistant/index.ts`**
- Add `send_student_email` tool definition
- Enhance `get_student_grades` to become `get_student_record`
- Add fuzzy name matching for student lookups
- Query multiple grade tables (journals, midterm, participation, submissions)

### Database Tables Queried

For transcript/grade queries:
- `mus240_journal_grades` - Journal scores and feedback
- `mus240_midterm_submissions` - Midterm exam grades
- `mus240_participation_grades` - Participation points
- `mus240_grade_summaries` - Overall calculated grades
- `assignment_submissions` - Assignment grades
- `gw_attendance_records` - Attendance records

For emails:
- `gw_profiles` - Student contact info
- `send-branded-email` edge function - Email delivery

### Fuzzy Name Matching

The assistant will use smart name matching:
```sql
-- Matches "Kevin" to "Kevin Johnson"
-- Matches "Johnson" to "Kevin Johnson"  
-- Matches "kevin j" to "Kevin Johnson"
WHERE full_name ILIKE '%Kevin%' OR full_name ILIKE '%Johnson%'
```

---

## Example Conversations

**Instructor:** "What grade is Kevin Johnson getting?"

**Assistant:** "Kevin Johnson currently has a **87.3% (B+)** in MUS-240:
- Journals: 156/180 pts (4 graded)
- Midterm: 78/90 pts  
- Participation: 45/50 pts
- Attendance: 12/14 classes (86%)

Would you like me to email Kevin his grade summary?"

---

**Instructor:** "List Kevin's transcripts"

**Assistant:** "Here's Kevin Johnson's complete MUS-240 record:

**Journals:**
- LJ1: 18/20 (A-) - 'Good analysis of blues form'
- LJ2: 19/20 (A) - 'Excellent connection to spirituals'
- LJ3: 20/20 (A) - 'Insightful commentary'
- LJ4: 17/20 (B+) - 'Could expand on historical context'

**Midterm Exam:** 78/90 (87%)
- Essay 1: 28/30
- Essay 2: 25/30
- Short Answer: 25/30

**Participation:** 45/50 (90%)
- Polls Answered: 8/10
- Discussion Posts: 4/5

**Attendance:** 12/14 present (86%)

**Current Grade:** 87.3% (B+)"

---

**Instructor:** "Email Kevin that his journal 4 grade is ready"

**Assistant:** "Email sent to Kevin Johnson (kjohnson@spelman.edu):

Subject: Your Journal 4 Grade is Ready
'Hi Kevin, your Journal 4 has been graded. You earned 17/20 (B+). Check GleeWorld for full feedback. - Dr. Johnson'

✅ Email delivered successfully!"

---

## Security

- Only users with `is_admin`, `is_super_admin`, or course instructor permissions can:
  - View other students' grades
  - Send emails to students
- Students can only query their own grades (not implemented in this phase)
- All email actions are logged to `gw_user_message_history`

---

## Expected Outcome

The Glee Assistant will become an instructor's communication hub:

- Query any student's grade with natural language
- Get detailed "transcript" views with all assignments
- Email students directly about grades, missing work, or announcements
- Send bulk emails to groups (all students, students below C, etc.)
- All from simple voice or text commands!
