

## Attendance Viewer in the Command Center

### What We're Building

Add an "Attendance" feature to the Attendance Command Center so that when you select an event, you can view who attended, their status, and quick stats -- all without leaving the Command Center.

### How It Works

1. **New "View Attendance" option on event cards**: Add a context menu item (and a button on mobile) to `CommandCenterEventCard` that opens an attendance viewer dialog for that event.

2. **New `EventAttendanceDialog` component**: A modal dialog showing:
   - Event name, date, and location in a branded navy header
   - Summary stats bar (Present / Absent / Excused / Late counts with color-coded badges)
   - A sortable, scrollable table of attendees with columns: Name, Status (color-coded badge), Check-in Time, Notes
   - Data pulled from both `gw_event_attendance` and legacy `attendance` tables, joined with `gw_profiles` for member names
   - Empty state when no attendance has been recorded yet

3. **Integration into Daily Run Sheet**: Add a small attendance indicator on each event card in the run sheet showing how many people checked in (e.g., "5 checked in") as a quick-glance metric.

### Technical Details

**New file: `src/components/calendar/command-center/EventAttendanceDialog.tsx`**
- Accepts `event: GleeWorldEvent | null`, `open`, `onOpenChange` props
- Queries `gw_event_attendance` joined with `gw_profiles` for the given `event.id`
- Also queries legacy `attendance` table and merges results
- Displays results in a table with status badges using the existing `CHART_COLORS` pattern
- Uses Spelman Navy header styling consistent with the Command Center aesthetic

**Modified file: `src/components/calendar/command-center/CommandCenterEventCard.tsx`**
- Add state: `showAttendanceDialog`
- Add context menu item: "View Attendance" with `ClipboardCheck` icon (visible to admins/exec board)
- Add mobile button for attendance viewing
- Render the new `EventAttendanceDialog` component

**Modified file: `src/components/calendar/command-center/DailyRunSheet.tsx`**
- For each event card, fetch a quick count of attendance records and display as a subtle badge (e.g., "3 present") below the event details

**Modified file: `src/components/calendar/command-center/index.ts`**
- Export the new `EventAttendanceDialog` component

### User Flow

1. User opens the Command Center calendar
2. Clicks on or right-clicks an event
3. Selects "View Attendance" from the context menu (or taps the attendance button on mobile)
4. A dialog opens showing the full attendance roster for that event with status breakdown
5. On the Daily Run Sheet, each event shows a quick attendance count at a glance

