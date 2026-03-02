
# Add Contract Signing Indicator to Tour Roster

## What You'll See
Each student on the tour roster will show a small indicator next to their name showing whether they have signed their tour contract or not. Students who haven't signed will be clearly highlighted so tour managers can follow up.

## How It Works
- When the roster loads, the system will also fetch all tour contract signatures
- Each roster member row will display a small badge: a green checkmark for "Signed" or a red/amber warning for "Not Signed"
- A summary strip at the top will show "X of Y contracts signed" so managers can see the overall status at a glance

## Technical Details

### File: `src/components/tour/TourRosterSection.tsx`
- In `fetchData`, add a query to `tour_contract_signatures` filtered by the known tour contract ID (`99ad60d3-0e94-41b2-b4f9-1b03146c62c9`) to get the list of `user_id`s who have signed
- Store the signed user IDs in a `Set` state variable
- In the roster member row (around line 304-350), add a contract status indicator:
  - If user_id is in the signed set: green "Signed" badge with a check icon
  - If not: amber/red "Not Signed" badge with an alert icon
- Add a new summary chip to the status strip (lines 247-268) showing contract completion: e.g., "Contracts: 12/18 signed"

### No database or schema changes needed
The `tour_contract_signatures` table already exists with `user_id` and `contract_id` columns.
