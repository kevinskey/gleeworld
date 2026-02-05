
# Plan: Populate Course Schedules and Generate Attendance Sessions

## Overview
Establish the complete course schedule infrastructure by updating `gw_courses` with `meeting_patterns` data and generating class sessions for Spring 2026 so all courses appear on calendars with attendance tracking enabled.

---

## Confirmed Course Schedules

| Course | Days | Time | Duration |
|--------|------|------|----------|
| **MUS 240** | Mon/Wed/Fri | 1:00-1:50 PM | 50 min |
| **MUS 070** | Mon/Wed/Fri | 5:00-6:15 PM | 75 min |
| **MUS 210** | Mon/Wed | 2:00-2:50 PM | 50 min |
| **LH 100** | Thu + Sun | Thu 7-9 PM, Sun 10 AM-1 PM | 2h / 3h |
| **GLEE 101** | By Appointment | — | No sessions |
| **MUS 001** | By Appointment | — | No sessions |
| **GLEE 000** | *Awaiting confirmation* | T/Th 4:00-5:15 PM? | 75 min? |

---

## Implementation Steps

### 1. Update `meeting_patterns` in Database
For each course with a fixed schedule, populate the JSONB column with days and times:

```text
MUS 240: { days: [1,3,5], startTime: "13:00", endTime: "13:50" }
MUS 070: { days: [1,3,5], startTime: "17:00", endTime: "18:15" }
MUS 210: { days: [1,3], startTime: "14:00", endTime: "14:50" }
LH 100:  { patterns: [
            { days: [4], startTime: "19:00", endTime: "21:00" },
            { days: [0], startTime: "10:00", endTime: "13:00" }
          ]}
```

### 2. Update Configuration Files
- Correct `src/config/academySyllabusDefaults.ts` times that conflict with user-provided schedules
- Update `src/utils/generateSpring2026Sessions.ts` with confirmed schedules
- Sync `src/config/academyCourses.ts` instructor office hours if needed

### 3. Generate Class Sessions for Spring 2026
Using the existing `CourseClassCalendar` generation logic:
- **Semester**: Jan 14 – Apr 29
- **Exception dates**: MLK Day (Jan 19), Spring Break (Mar 9-13), Good Friday (Apr 3), Founders Day (Apr 9), Research Day (Apr 17)

Expected session counts:
- MUS 240 (MWF): ~42 sessions
- MUS 070 (MWF): ~42 sessions  
- MUS 210 (MW): ~28 sessions
- LH 100 (Thu+Sun): ~28 sessions (14 Thu + 14 Sun)

### 4. Auto-Generate QR Codes for Attendance
Each created session gets a corresponding `gw_attendance_qr_codes` record linked via `qr_code_id` to enable instant attendance tracking.

### 5. Create Calendar Events
Link sessions to `gw_events` using the course's `calendar_id` so they appear on both the instructor calendar and the main GleeWorld calendar.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/config/academySyllabusDefaults.ts` | Fix MUS 240 time (1-1:50 PM, MWF not T/Th), MUS 070 time (5-6:15 PM) |
| `src/utils/generateSpring2026Sessions.ts` | Update course configs with confirmed schedules |
| Database: `gw_courses` | Populate `meeting_patterns` JSONB for each course |
| Database: `gw_course_class_sessions` | Insert session records for all courses |
| Database: `gw_attendance_qr_codes` | Insert QR codes linked to sessions |
| Database: `gw_events` | Insert calendar events for visibility |

---

## One Clarification Needed

**GLEE 000 (Sight Singing Institute)**: The default shows T/Th 4:00-5:15 PM. Is this correct, or should it have a different schedule?

---

## Technical Notes

- The `CourseClassCalendar` component already has a "Generate Semester" button that can create sessions once `meeting_patterns` is populated
- LH 100 requires special handling for dual time slots (Thursday evening vs Sunday morning)
- Sessions for "by appointment" courses (GLEE 101, MUS 001) will not be generated
- All times are stored in `America/New_York` timezone per project standards
