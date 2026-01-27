

## Automatic QR Codes for Each Course Session

### Summary

Every course will have QR codes **automatically generated** when class sessions are created. Instructors and TAs will be able to display the session's QR code directly from the instructor console with a **single click** — no manual QR generation required.

---

### Current State

The system already has much of the infrastructure in place:

1. **QR codes are auto-generated** when class sessions are created (via `CourseClassCalendar.tsx`) and stored in `gw_attendance_qr_codes` with `context_type: 'course_session'`

2. **Each session is linked** to its QR code via the `qr_code_id` column in `gw_course_class_sessions`

3. The `CourseClassCalendar` component already has a `generateQRCode()` function that either retrieves an existing QR code or creates a new one if needed

**What's missing**: A streamlined way to display the QR code from the instructor console's main attendance workflow — currently instructors must:
- Navigate to Calendar
- Find the session  
- Click on it
- Generate/view the QR code

---

### Implementation Plan

#### 1. Add "Today's Session QR" Panel to Instructor Console

A new prominent panel in the instructor console that automatically:
- Detects the current or next class session based on course schedule
- Displays the session's pre-generated QR code with one click
- Shows attendance status and count in real-time

**Location**: Add to the "Attendance Security" tab or create a new "Quick Attendance" tab

```text
┌─────────────────────────────────────────────────────┐
│  📅 Today's Class                                   │
│  ─────────────────────────────────────────────────  │
│  MUS 210 - Class 12                                 │
│  10:00 AM - 11:30 AM • Fine Arts 105                │
│                                                     │
│  ┌───────────────────┐   Status: Ready              │
│  │                   │   Enrolled: 24               │
│  │    [QR CODE]      │   Checked In: 0              │
│  │                   │                              │
│  │                   │   [Show Full Screen]         │
│  └───────────────────┘   [Download QR]              │
│                                                     │
│  ⚡ QR auto-generated • Refresh available           │
└─────────────────────────────────────────────────────┘
```

#### 2. Create `QuickAttendanceQR` Component

A new reusable component (`src/components/course/QuickAttendanceQR.tsx`) that:

- Accepts `courseId` as prop
- Queries `gw_course_class_sessions` for today's session (or the next upcoming one)
- Fetches the linked QR code from `gw_attendance_qr_codes`
- Renders the QR image automatically (no manual generation needed)
- Provides full-screen display mode for projecting in class
- Shows live attendance count via realtime subscription

#### 3. Update Instructor Console Navigation

Add a dedicated "Attendance" or "Quick Attendance" tab to the instructor console sidebar that loads the new `QuickAttendanceQR` component:

```typescript
// In navCategories - add to Students section
{
  value: 'quick-attendance',
  label: 'Attendance',
  icon: QrCode
}
```

#### 4. Database Query Logic

Find today's or upcoming session:

```sql
SELECT s.*, qr.qr_token, qr.id as qr_id
FROM gw_course_class_sessions s
LEFT JOIN gw_attendance_qr_codes qr ON qr.id = s.qr_code_id
WHERE s.course_id = :courseId
  AND s.session_date >= CURRENT_DATE
ORDER BY s.session_date ASC, s.start_time ASC
LIMIT 1
```

#### 5. Full-Screen Presentation Mode

Add a "Present" button that opens the QR code in a maximized view suitable for:
- Projection on classroom screens
- Large display during class
- Mobile-friendly instructor display

---

### Technical Details

**New files to create:**
- `src/components/course/QuickAttendanceQR.tsx` — Main QR display component
- `src/components/course/AttendanceFullScreenModal.tsx` — Full-screen presentation mode

**Files to modify:**
- `src/pages/courses/CourseInstructorConsole.tsx` — Add new nav item and render component

**Existing infrastructure to leverage:**
- `gw_attendance_qr_codes` table with `context_type = 'course_session'`
- `qrcode` library already installed
- Real-time subscriptions for attendance updates
- `gw_course_class_sessions.qr_code_id` foreign key relationship

**QR Code URL Format:**
```
https://gleeworld.lovable.app/attendance/scan?token={qr_token}
```

---

### User Experience

**For instructors:**
1. Open instructor console
2. Click "Attendance" in sidebar
3. See today's session with QR already displayed
4. Click "Present" to show full-screen for class

**For TAs:**
- Same workflow (TAs already have instructor console access)

**No more:**
- Going to separate QR generator page
- Selecting events from dropdown
- Manually generating codes
- Waiting for token creation

---

### Benefits

- **Zero setup**: QR codes exist from the moment sessions are created
- **Instant display**: One click to show attendance QR
- **Full-screen mode**: Easy projection for in-class use  
- **Real-time tracking**: See check-ins as they happen
- **Consistent tokens**: Same QR works for entire session (no rotation needed for normal use)
- **Fallback available**: Security controls tab still available for rotating QR if needed

