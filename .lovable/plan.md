

## Create "Tour Group" from Tour Roster

### Overview
Add a button to the Tour Manager interface that creates a messenger group called **"Tour Group"** and automatically adds all confirmed tour roster members to it. If the group already exists, it will sync membership instead of creating a duplicate.

### Implementation Steps

1. **Create a new component: `CreateTourGroupButton`**
   - Location: `src/components/tour/CreateTourGroupButton.tsx`
   - A button labeled "Create Tour Group" (or "Sync Tour Group" if it already exists)
   - On click:
     - Fetch all confirmed members from `gw_tour_roster`
     - Check if a group named "Tour Group" with `group_type = 'tour'` already exists in `gw_message_groups`
     - If not, create it with name "Tour Group", description "Tour roster messaging group", group_type "general" (or a new "tour" type)
     - Add all roster members to `gw_group_members` (creator as admin, others as members)
     - If the group already exists, sync: add missing members, optionally remove members no longer on roster
   - Show a success toast with the member count

2. **Add the button to the Tour Manager landing page**
   - File: `src/components/tour-manager/TourManagerLanding.tsx`
   - Place the button near the Tour Roster card so admins can easily create/sync the group

3. **Add "tour" to the group type options** (optional enhancement)
   - Update `GroupManagement.tsx` SelectContent to include a "Tour" option so the group is properly categorized

### Technical Details

- **Roster query**: `gw_tour_roster` filtered by `status = 'confirmed'` to get `user_id` list
- **Group creation**: Uses `gw_message_groups` table with `created_by` set to current user
- **Member insertion**: Bulk insert into `gw_group_members` with `upsert` to avoid duplicate key errors
- **Profile lookup**: Fetch profiles separately from `gw_profiles` and merge in memory (no FK join available per project conventions)
- **Permissions**: Only admins, super admins, and exec board can use this button (reuses existing permission patterns)
- **No database migration needed** -- existing tables support this feature as-is

### Files to Create/Modify
- **Create**: `src/components/tour/CreateTourGroupButton.tsx`
- **Modify**: `src/components/tour-manager/TourManagerLanding.tsx` (add the button)

