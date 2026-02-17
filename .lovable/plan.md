

# Two-Step Attendance: GPS Check-In + QR Check-Out

## How It Works

1. **Student arrives** -- taps "Check In" on the GPS card (existing flow). This marks them as **"in_rehearsal"** (not yet "present").
2. **At end of class** -- instructor displays a checkout QR code. Student scans it with the QR scanner to be marked **"present"**.
3. **If student never scans the checkout QR** -- they stay as "in_rehearsal" and are **not counted as present**.

This ensures students who leave early without scanning out are not credited with full attendance.

---

## Changes

### 1. New attendance status: `in_rehearsal`
Add `in_rehearsal` as a valid status in `gw_attendance_records`. The GPS check-in will write this status instead of `present`.

### 2. Modify `GpsCheckin.tsx`
- Change `handleCheckin` to set `status: 'in_rehearsal'` instead of `'present'`
- Replace the "Check Out" button with an **"In Rehearsal"** badge (no manual checkout -- must scan QR)
- Update the `isCheckedIn` check to look for `in_rehearsal` status
- Show "Scan QR to complete attendance" as helper text

### 3. Instructor Checkout QR
- Add a **"Generate Checkout QR"** button to the instructor's attendance console (`AttendanceQRDisplay` or a new component)
- This generates a QR token tagged as `checkout` type (distinct from check-in QR tokens)
- The checkout QR uses the same `gw_dqr_codes` / session QR system but with a `checkout` context

### 4. Modify QR Scanner to handle checkout scans
- Update `process_qr_attendance_scan` (or create a new RPC `process_qr_checkout_scan`) to:
  - Find the student's `in_rehearsal` record for the session
  - Update it to `present` with a checkout timestamp in the note
  - If no `in_rehearsal` record exists, reject ("You must check in via GPS first")

### 5. Update attendance displays
- `CourseAttendance.tsx` and the instructor grid should recognize `in_rehearsal` as "checked in but not yet present"
- Students with `in_rehearsal` at session close are effectively absent/incomplete

---

## Technical Details

### Database Migration
```text
-- Allow 'in_rehearsal' status in attendance records
-- Add a checkout_qr_type field or use existing token metadata
-- Add checkout token generation function
```

### Files to Modify
- `src/components/course/GpsCheckin.tsx` -- change status to `in_rehearsal`, remove checkout button, show badge
- `src/components/attendance/QRAttendanceScanner.tsx` -- handle checkout QR tokens (update `in_rehearsal` to `present`)
- `src/components/academy/attendance/AttendanceQRDisplay.tsx` -- add checkout QR generation mode
- SQL: new RPC or modify `process_qr_attendance_scan` to support checkout flow
- SQL: `generate_session_qr_code` -- support a `p_qr_type` parameter (`checkin` vs `checkout`)

### Files to Create
- None required -- extends existing components

### Flow Diagram
```text
Student arrives at venue
  --> GPS confirms in-range
  --> Taps "Check In"
  --> Record created: status = "in_rehearsal"
  --> UI shows green "In Rehearsal" badge + "Scan QR at end of class"

End of class:
  --> Instructor taps "Generate Checkout QR"
  --> QR displayed on projector
  --> Student opens QR scanner, scans checkout code
  --> RPC finds their "in_rehearsal" record, updates to "present"
  --> Student sees "Attendance confirmed" toast

Student who leaves early:
  --> Never scans checkout QR
  --> Record stays as "in_rehearsal" (not counted as present)
```

