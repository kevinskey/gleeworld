

## Add Office Hours Booking Card to Student Dashboard

### Approach
Add a compact, mobile-first "Office Hours" card directly to the student dashboard landing area. This gives students immediate visibility of appointment availability without cluttering the screen.

### What Students Will See
- A clean card titled "OFFICE HOURS with Dr. Johnson"
- Location info (Rockefeller Fine Arts Building 105)
- Next available time slot (if any)
- A prominent "Book Appointment" button that navigates to `/book-appointment`
- Current upcoming appointment status (if they already have one booked)

### Why This Is Best for Mobile
- Minimal screen real estate -- just a summary card, not a full form
- One-tap action to book (no scrolling through embedded forms)
- The full booking flow at `/book-appointment` is already optimized for mobile
- Avoids duplicating complex form logic on two pages

### Technical Steps

1. **Create `src/components/appointments/OfficeHoursCard.tsx`**
   - Compact Card component showing Dr. Johnson's office hours info
   - Query `gw_services` for next available slot
   - Query `gw_appointments` for user's upcoming appointment (if any)
   - "Book Appointment" button routes to `/book-appointment`
   - Shows appointment status badge if one exists (Confirmed/Pending)

2. **Integrate into the student dashboard**
   - Add the `OfficeHoursCard` to the main dashboard grid layout
   - Position it prominently (top area on mobile, sidebar area on desktop)
   - Uses the existing `grid-cols-1 lg:grid-cols-12` layout pattern

3. **Styling**
   - Follow the high-contrast design system (dark text on white card)
   - Navy accent for the "Book" button (matches Spelman branding)
   - Mobile: full-width stacked card
   - Desktop: fits within the dashboard grid alongside other modules

### No Changes Needed
- The existing `/book-appointment` page stays as-is (it's already mobile-optimized)
- No database changes required
- No new dependencies

