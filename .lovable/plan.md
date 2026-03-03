

# Tour Roll Call / "I Am Here" Check-In System

## Overview
Add a **Roll Call** section to the Tour Manager dashboard where tour managers can initiate location-based check-ins for each tour stop. When activated, roster members see an **"I Am Here"** button (in the MUS 070 student tour view) to confirm their presence. Tour managers get a real-time attendance board showing who has and hasn't checked in.

---

## Database Changes

### New Table: `gw_tour_checkins`
Stores each check-in session created by a tour manager.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| tour_id | uuid (FK -> gw_tours) | |
| city_id | uuid (FK -> gw_tour_cities) | nullable |
| title | text | e.g. "Morning Roll Call - Chicago" |
| checkin_date | date | |
| opened_at | timestamptz | when manager activated it |
| closed_at | timestamptz | nullable, when manager closed it |
| created_by | uuid | manager who created it |
| created_at | timestamptz | default now() |

### New Table: `gw_tour_checkin_responses`
Stores each member's "I Am Here" tap.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| checkin_id | uuid (FK -> gw_tour_checkins) | |
| user_id | uuid | the member |
| checked_in_at | timestamptz | default now() |
| unique(checkin_id, user_id) | | prevent double taps |

### RLS Policies
- **Tour managers** (admin/exec) can INSERT/SELECT/UPDATE on `gw_tour_checkins`
- **Authenticated roster members** can SELECT checkins and INSERT their own response
- Members can only SELECT their own responses; managers can SELECT all

---

## Frontend Changes

### 1. New Component: `TourRollCallSection.tsx`
Located at `src/components/tour-manager/TourRollCallSection.tsx`

**Manager View:**
- **Create Roll Call** button -- pick a city/date, give it a title, opens the session
- **Active Sessions** list -- shows open roll calls with a real-time count (e.g. "18/24 checked in")
- **Close Session** button to lock it
- **Attendance Board** -- grid of roster members with green checkmark (present) or red X (missing), with timestamps
- Past sessions shown in a collapsible history section

### 2. Add Nav Item to Tour Manager Dashboard
In `TourManagerDashboard.tsx`:
- Add `{ value: 'roll-call', label: 'Roll Call', icon: CheckCircle2 }` to `navItems` (after Roster)
- Add content config entry
- Add case in `renderContent()` switch

### 3. Student "I Am Here" Button in MUS 070 Tour View
In `src/components/mus070/student/StudentTourView.tsx`:
- Query for any open checkin sessions (`closed_at IS NULL`)
- If an active session exists, display a prominent **"I Am Here"** button at the top of the tour tab
- On tap, insert a response row; button changes to a green checkmark with timestamp
- If already checked in, show confirmed state

---

## Technical Details

- Use `useQuery` with a short refetch interval (10s) on the manager attendance board for near-real-time updates
- Use Supabase `count` queries to show "X of Y checked in" without fetching all profiles
- Roster member list comes from `gw_tour_roster` (status = 'confirmed'), merged with `gw_profiles` for names (existing pattern from memory context)
- The `CheckCircle2` icon is already imported in the dashboard file

