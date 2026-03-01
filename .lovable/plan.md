
# Super-Admin Control Center -- Landing Page on Login

## Overview
Transform the Office Hours Dashboard into a unified **Control Center** with tabs for Appointments, Calendar, Academy, and Modules. Additionally, make this the **default landing page** for super-admins after login, replacing `/dashboard`.

## What Changes

### 1. Expand AdminOfficeHoursDashboard into a Control Center
Add a top-level tab bar with 4 sections:

```text
[ Appts | Calendar | Academy | Modules ]
```

- **Appts**: All existing appointment management (unchanged)
- **Calendar**: Lazy-loads `CommandCenterCalendar` inline
- **Academy**: Lazy-loads `GleeAcademyDashboardCard` with instructor quick links
- **Modules**: Renders the `MyModules` grid for direct access to all admin tools

### 2. Add `/control-center` Route Alias
Add a new route in `App.tsx` pointing `/control-center` to the same `BookAppointmentPage`, giving a cleaner URL.

### 3. Make Control Center the Super-Admin Landing Page
Update two redirect points so super-admins land on `/control-center` instead of `/dashboard` after login:

- **`useRoleBasedRedirect.ts`** (line 173): Change `navigate('/dashboard')` to `navigate('/control-center')` for super-admins only
- **`HomeRoute.tsx`** (line 51): Change the force-redirect for super-admins to `/control-center`

Admins and executive board members continue landing on `/dashboard` as before.

### 4. Update DashboardSwitcher
Add a "Control Center" link in the dropdown so you can jump back to `/control-center` from anywhere.

## Technical Details

### Files to modify:

1. **`src/components/appointments/AdminOfficeHoursDashboard.tsx`**
   - Wrap existing content in a new top-level `Tabs` component
   - Lazy-load `CommandCenterCalendar`, `GleeAcademyDashboardCard`, and `MyModules`
   - Maintain the underwater aesthetic across all tabs

2. **`src/App.tsx`**
   - Add `/control-center` route pointing to `BookAppointmentPage`

3. **`src/hooks/useRoleBasedRedirect.ts`**
   - Line 171-174: Change super-admin redirect from `/dashboard` to `/control-center`

4. **`src/components/routing/HomeRoute.tsx`**
   - Line 51: Change super-admin force-redirect from `/dashboard` to `/control-center`

5. **`src/components/navigation/DashboardSwitcher.tsx`**
   - Add a "Control Center" menu item linking to `/control-center`

6. **`src/constants/routes.ts`**
   - Add `CONTROL_CENTER: '/control-center'` to `ROUTES` and `PROTECTED_ROUTES`
