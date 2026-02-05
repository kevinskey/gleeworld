
# Plan: Populate Course Schedules and Generate Attendance Sessions

## ✅ Status: IMPLEMENTED

---

## Confirmed Course Schedules

| Course | Days | Time | Duration | Status |
|--------|------|------|----------|--------|
| **MUS 240** | Mon/Wed/Fri | 1:00-1:50 PM | 50 min | ✅ Ready |
| **MUS 070** | Mon/Wed/Fri | 5:00-6:15 PM | 75 min | ✅ Ready |
| **MUS 210** | Mon/Wed | 2:00-2:50 PM | 50 min | ✅ Ready |
| **LH 100** | Thu + Sun | Thu 7-9 PM, Sun 10 AM-1 PM | 2h / 3h | ✅ Ready |
| **GLEE 101** | By Appointment | — | No sessions | ✅ N/A |
| **MUS 001** | By Appointment | — | No sessions | ✅ N/A |
| **GLEE 000** | *Awaiting confirmation* | T/Th 4:00-5:15 PM? | 75 min? | ⏳ Pending |

---

## What Was Implemented

### 1. Config Files Updated ✅
- `src/config/academySyllabusDefaults.ts`: Corrected MUS 070 (5-6:15 PM), MUS 240 (MWF 1-1:50 PM), GLEE 101 (By Appointment)
- `src/utils/generateSpring2026Sessions.ts`: LH 100 now has separate Thu/Sun entries with correct times

### 2. Meeting Patterns Utility Created ✅
- `src/utils/updateCourseMeetingPatterns.ts`: Holds all confirmed schedules as structured JSONB data
- Can be called from authenticated admin context to populate `gw_courses.meeting_patterns`

### 3. Sync Schedule Button Added ✅
- `src/components/course/CourseClassCalendar.tsx`: Added "Sync Schedule" button
- Shows when course has no `meeting_patterns` but has a confirmed schedule in the utility
- Clicking syncs the pattern to the database

---

## How to Generate Sessions

1. **Navigate** to any course's Calendar tab (e.g., `/academy/mus-240?tab=calendar`)
2. If no meeting pattern exists, click **"Sync Schedule"** → populates `meeting_patterns` JSONB
3. Click **"Generate Semester"** → creates all class sessions with:
   - Proper dates based on semester (Jan 14 – Apr 29)
   - Exception dates excluded (MLK, Spring Break, etc.)
   - Auto-generated QR codes for attendance
   - Calendar events linked for visibility

---

## Still Pending

**GLEE 000 (Sight Singing Institute)**: User needs to confirm T/Th 4:00-5:15 PM schedule before it can be added to the utility.
