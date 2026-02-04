

# Alumni and Fan Registration Approval System

## Current System Analysis

After exploring the codebase, I found:

1. **Authentication**: Single `/auth` page handles all user types with optional `?role=` parameter support
2. **Profile Storage**: `gw_profiles` table has `verified` field and `role` field (includes 'alumna', 'fan', 'student', etc.)
3. **Existing Approval Patterns**: Budget approvals, excuse requests, and story approvals already exist with similar workflows
4. **Email System**: `gw-send-email` edge function using Resend is already configured
5. **Role Management**: Separate `user_roles` table exists for proper role storage
6. **Alumna Landing**: `/alumnae` page exists with verified alumna checks

## What We'll Build

### Registration Flow for New Users

```text
User clicks "Sign Up" → Role Selection Screen
         ↓
   ┌─────┴─────┐
   ↓           ↓
 "Fan"      "Alumna"
   ↓           ↓
Fill Form   Fill Form
   ↓           ↓
Submit → Creates account with verified=false
   ↓
Email sent to webmaster(s) for approval
   ↓
Redirect to "Thank You" page with messaging
   ↓
Webmaster receives approval request
   ↓
Webmaster approves/denies in Admin Dashboard
   ↓
Confirmation email sent to user
```

### Existing User Flow

If an alumna is already registered on GleeWorld (perhaps as a former student), the admin can update their role to 'alumna' directly from the Admin Dashboard.

---

## Technical Implementation

### 1. Database Changes

**New table: `registration_requests`**
- `id` (uuid)
- `user_id` (uuid) - links to auth.users
- `email` (text)
- `full_name` (text)
- `requested_role` (text) - 'fan' or 'alumna'
- `graduation_year` (integer, nullable) - for alumnae
- `voice_part` (text, nullable) - for alumnae
- `status` (text) - 'pending', 'approved', 'denied'
- `admin_notes` (text, nullable)
- `reviewed_by` (uuid, nullable)
- `reviewed_at` (timestamp, nullable)
- `created_at` (timestamp)

### 2. Frontend Components

**RoleSelectionForm** (new component)
- Displayed after email/password entry on signup
- Two large cards: "Join as Fan/Supporter" and "Join as Alumna"
- Clear descriptions of what each role gets access to

**ThankYouPage** (new page)
- Shows after registration submission
- Personalized message based on selected role
- "Check your email for confirmation" messaging
- Link back to public landing page

**AdminRegistrationRequests** (new admin component)
- Table of pending requests with filters (fan/alumna/all)
- Approve/Deny buttons with optional notes
- Shows graduation year and voice part for alumnae requests
- Bulk actions for efficiency

### 3. Edge Function Updates

**gw-registration-notification** (new function)
- Called when new registration request is created
- Sends email to webmaster/admin with request details
- Includes approve/deny links (deep links to admin panel)

**gw-registration-decision** (new function)
- Called when admin approves/denies request
- Updates `gw_profiles.verified` and `gw_profiles.role`
- If approved, adds entry to `user_roles` table
- Sends confirmation email to user

### 4. Auth Flow Updates

**SignupForm.tsx** modifications:
- After successful auth.signUp, show role selection
- Create `registration_requests` entry with pending status
- Do not automatically grant role access
- Profile created with `verified = false`

**AuthLayout.tsx**:
- Add support for 'alumna' and 'fan' themes (already partially exists)

### 5. Profile and Access Control Updates

**AlumnaeRoute.tsx**:
- Already checks `verified === true` for alumna access
- No changes needed

**FanRoute.tsx**:
- Add verified check if needed for fan-exclusive content

---

## User Experience Details

### Role Selection Cards

| Fan/Supporter | Alumna |
|---------------|--------|
| Access to exclusive content | Access to alumnae-only events |
| Concert updates and announcements | Mentorship opportunities |
| Community forum participation | Reunion planning tools |
| Behind-the-scenes updates | Memory wall and legacy stories |

### Admin Email Notification Template

```
Subject: New GleeWorld Registration Request: [Fan/Alumna]

Hello Webmaster,

A new user has registered on GleeWorld and is awaiting your approval:

Name: [Full Name]
Email: [Email]
Requested Role: [Fan / Alumna]
Graduation Year: [Year] (if alumna)
Voice Part: [Part] (if alumna)
Submitted: [Date/Time]

Please review this request in the Admin Dashboard:
[Link to Admin Registration Panel]

Best,
GleeWorld Automated System
```

### User Confirmation Email Templates

**Approved:**
```
Subject: Welcome to GleeWorld - Your Account is Approved!

Dear [Name],

Great news! Your GleeWorld [Fan/Alumna] registration has been approved.

You can now log in and access:
- [List of features based on role]

Log in here: [Link]

Welcome to the family!
The GleeWorld Team
```

**Denied:**
```
Subject: GleeWorld Registration Update

Dear [Name],

Thank you for your interest in joining GleeWorld.

Unfortunately, we were unable to approve your [Fan/Alumna] 
registration at this time.

[Admin notes if provided]

If you have questions, please contact us at [contact email].

Best regards,
The GleeWorld Team
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/RoleSelectionStep.tsx` | Role selection cards after signup |
| `src/pages/RegistrationThankYou.tsx` | Thank you page after submission |
| `src/components/admin/RegistrationRequestsPanel.tsx` | Admin panel for approvals |
| `supabase/functions/gw-registration-notification/index.ts` | Email to webmaster |
| `supabase/functions/gw-registration-decision/index.ts` | Process approval/denial |
| `supabase/migrations/XXXXXX_add_registration_requests.sql` | Database table |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/SignupForm.tsx` | Integrate role selection step |
| `src/components/auth/AuthTabs.tsx` | Handle multi-step signup flow |
| `src/pages/admin/AlumnaeAdmin.tsx` | Add registration requests tab |
| `src/App.tsx` | Add thank you page route |

---

## Admin Capability: Direct User Role Assignment

The existing User Management page already allows admins to edit user profiles. We'll ensure:
- Admins can set any user's role to 'alumna' or 'fan'
- Admins can toggle the `verified` field
- This allows converting existing users (like graduated students) to alumnae

---

## Security Considerations

1. **Email verification**: New users must verify email before their registration request is processed
2. **RLS policies**: Only admins can view/update registration_requests table
3. **Edge function auth**: Registration notification only triggers after verified email
4. **Rate limiting**: Prevent spam registration attempts

---

## Summary

This plan creates a gated registration process where new fans and alumnae must be approved by the webmaster before gaining access to role-specific features. It maintains the shared profile system while adding approval workflow infrastructure that matches existing patterns in the codebase (like budget approvals and excuse requests).

