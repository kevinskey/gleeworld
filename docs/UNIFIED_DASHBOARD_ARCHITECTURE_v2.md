# GleeWorld Unified Dashboard Architecture v2.0
## Final Specification (with Required Fixes)

---

## 1. Overview

**Approach:** Single unified dashboard (`/dashboard`) for all authenticated users + public landing page (`/`).

**Key Changes from v1:**
- ❌ Remove boolean TA flags from profiles
- ❌ Remove `min_role_level` (broken for fan/alumna parity)
- ✅ Add offering-scoped permissions
- ✅ Add subscription tier gating
- ✅ Separate identity roles from work assignments

---

## 2. Database Schema

### 2.1 gw_profiles Changes

**REMOVE these columns if they exist:**
```sql
-- DO NOT USE
-- is_teaching_assistant BOOLEAN
-- ta_permissions JSONB
```

**ADD these columns:**
```sql
ALTER TABLE gw_profiles
  ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'fan',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Add constraints
ALTER TABLE gw_profiles
  ADD CONSTRAINT valid_primary_role 
    CHECK (primary_role IN ('super_admin', 'admin', 'student', 'alumna', 'fan')),
  ADD CONSTRAINT valid_subscription_tier 
    CHECK (subscription_tier IN ('free', 'plus', 'premium')),
  ADD CONSTRAINT valid_subscription_status 
    CHECK (subscription_status IN ('none', 'active', 'comped', 'past_due', 'canceled'));
```

**Primary Roles (mutually exclusive):**
| Role | Description |
|------|-------------|
| `super_admin` | Full system access, can manage all settings |
| `admin` | Administrative access, manages users/content |
| `student` | Active Glee Club member or Academy student |
| `alumna` | Graduated member (cannot be student simultaneously) |
| `fan` | Subscriber/supporter (default for new signups) |

**Subscription Tiers (monetization):**
| Tier | Price | Access Level |
|------|-------|--------------|
| `free` | $0 | Basic fan content |
| `plus` | TBD | Enhanced content + early access |
| `premium` | TBD | All content + exclusive features |

---

### 2.2 Course Organization Tables (NEW)

```sql
-- Course template (reusable across semesters)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,              -- MUS070, MUS240, etc.
  title TEXT NOT NULL,
  description TEXT,
  is_glee_club BOOLEAN DEFAULT false,     -- Special flag for Glee Club "course"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Semester instance of a course
CREATE TABLE course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,                 -- 'Spring 2026', 'Fall 2025'
  academic_year TEXT NOT NULL,            -- '2025-2026'
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, semester, academic_year)
);

-- Student enrollments (source of truth for student access)
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_status TEXT DEFAULT 'active',  -- active|dropped|completed
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  dropped_at TIMESTAMPTZ,
  UNIQUE(offering_id, user_id)
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
```

---

### 2.3 TA Assignments Table (NEW)

```sql
CREATE TABLE ta_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ta_type TEXT NOT NULL,                  -- lead_ta|grader|content_creator|proctor
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(offering_id, user_id, ta_type),
  CONSTRAINT valid_ta_type CHECK (ta_type IN ('lead_ta', 'grader', 'content_creator', 'proctor'))
);

ALTER TABLE ta_assignments ENABLE ROW LEVEL SECURITY;
```

**TA Types:**
| Type | Permissions |
|------|-------------|
| `lead_ta` | Full course management, can assign other TAs |
| `grader` | Grade assignments, view student submissions |
| `content_creator` | Upload/edit course materials |
| `proctor` | Monitor exams, attendance |

---

### 2.4 Exec Assignments Table (NEW)

```sql
-- Glee Club is treated as a course offering for exec assignments
CREATE TABLE exec_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exec_role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(offering_id, user_id, exec_role),
  CONSTRAINT valid_exec_role CHECK (exec_role IN (
    'president', 'vice_president', 'treasurer', 'secretary',
    'tour_manager', 'wardrobe_manager', 'pr_coordinator',
    'social_chair', 'historian', 'chaplain', 'student_conductor',
    'section_leader_s1', 'section_leader_s2', 'section_leader_a1', 'section_leader_a2'
  ))
);

ALTER TABLE exec_assignments ENABLE ROW LEVEL SECURITY;
```

---

### 2.5 Dashboard Modules Table (UPDATED)

```sql
CREATE TABLE dashboard_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL UNIQUE,         -- kebab-case identifier
  name TEXT NOT NULL,                     -- Display name
  description TEXT,
  icon TEXT,                              -- Lucide icon name
  category TEXT NOT NULL,                 -- personal|academy|music|organization|executive|admin|alumni|fan
  route_path TEXT,                        -- /dashboard/module-id
  component_key TEXT,                     -- React component key for lazy loading
  min_subscription_tier TEXT DEFAULT 'free',  -- free|plus|premium
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_category CHECK (category IN (
    'personal', 'academy', 'music', 'organization', 
    'executive', 'admin', 'alumni', 'fan'
  )),
  CONSTRAINT valid_subscription_tier CHECK (min_subscription_tier IN ('free', 'plus', 'premium'))
);

ALTER TABLE dashboard_modules ENABLE ROW LEVEL SECURITY;
```

**DO NOT include `min_role_level` - it's broken for fan/alumna parity.**

---

### 2.6 Role Permissions Table (UPDATED)

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,                -- fan|student|alumna|admin|super_admin|teaching_assistant
  sub_role TEXT,                          -- grader|content_creator|treasurer|tour_manager|etc
  module_id TEXT NOT NULL REFERENCES dashboard_modules(module_id),
  scope_type TEXT DEFAULT 'global',       -- global|offering
  scope_id UUID,                          -- course_offering.id when scope_type='offering'
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  effect TEXT DEFAULT 'allow',            -- allow|deny (deny wins)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_name, sub_role, module_id, scope_type, scope_id),
  CONSTRAINT valid_effect CHECK (effect IN ('allow', 'deny')),
  CONSTRAINT valid_scope_type CHECK (scope_type IN ('global', 'offering'))
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
```

**Permission Resolution Order:**
1. Check global permissions for primary role
2. Check offering-scoped permissions for TA/exec assignments
3. Apply `deny` effects last (deny always wins)
4. Apply subscription tier gate from `dashboard_modules.min_subscription_tier`

---

## 3. Role Hierarchy

### 3.1 Identity Roles (Primary)

```
┌─────────────────────────────────────────────────────────────┐
│                    IDENTITY ROLES                           │
│         (mutually exclusive, stored in gw_profiles)         │
├─────────────────────────────────────────────────────────────┤
│  super_admin  →  Full system access                         │
│  admin        →  Administrative access                      │
│  student      →  Active member/student (cannot be alumna)   │
│  alumna       →  Graduated member (cannot be student)       │
│  fan          →  Subscriber/supporter (default)             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Work Roles (Assignment-Based)

```
┌─────────────────────────────────────────────────────────────┐
│                    WORK ROLES                               │
│     (assignment-based, offering-scoped, can stack)          │
├─────────────────────────────────────────────────────────────┤
│  teaching_assistant                                         │
│    ├── lead_ta         (full course management)             │
│    ├── grader          (grade submissions)                  │
│    ├── content_creator (upload materials)                   │
│    └── proctor         (monitor exams/attendance)           │
├─────────────────────────────────────────────────────────────┤
│  executive_board (Glee Club offering only)                  │
│    ├── president                                            │
│    ├── vice_president                                       │
│    ├── treasurer                                            │
│    ├── secretary                                            │
│    ├── tour_manager                                         │
│    ├── wardrobe_manager                                     │
│    ├── pr_coordinator                                       │
│    ├── social_chair                                         │
│    ├── historian                                            │
│    ├── chaplain                                             │
│    ├── student_conductor                                    │
│    └── section_leader_*                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Permission Resolution Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    PERMISSION RESOLUTION                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. FETCH USER CONTEXT                                            │
│    - gw_profiles: primary_role, subscription_tier/status         │
│    - course_enrollments: student access to offerings             │
│    - ta_assignments: TA access to offerings                      │
│    - exec_assignments: exec access to Glee Club offering         │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. DETERMINE ACTIVE OFFERING CONTEXT                             │
│    - If user has multiple assignments → show offering selector   │
│    - Store selected offering in session/URL state                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. COLLECT APPLICABLE PERMISSIONS                                │
│    a) Global permissions for primary_role                        │
│    b) Offering-scoped permissions for TA role + ta_type          │
│    c) Offering-scoped permissions for exec_role                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. APPLY DENY RULES                                              │
│    - Any permission with effect='deny' overrides allow           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. APPLY SUBSCRIPTION TIER GATE                                  │
│    - Check dashboard_modules.min_subscription_tier               │
│    - Compare with user's subscription_tier                       │
│    - Tier order: free < plus < premium                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. RETURN RESULT                                                 │
│    - allowedModules: [{ module, permissions }]                   │
│    - lockedModules: [{ module, reason: "Upgrade to Plus" }]      │
│    - currentOffering: offering context                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Module Permission Matrix

**Generated from `role_permissions` table - DO NOT HARDCODE**

### 5.1 Personal Modules (All Authenticated Users)

| Module | fan | student | alumna | admin | super_admin |
|--------|-----|---------|--------|-------|-------------|
| profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| settings | ✅ | ✅ | ✅ | ✅ | ✅ |

### 5.2 Academy Modules

| Module | fan | student | alumna | TA (scoped) | admin | super_admin |
|--------|-----|---------|--------|-------------|-------|-------------|
| my-classes | ❌ | ✅ enrolled | ❌ | ✅ assigned | ✅ | ✅ |
| assignments | ❌ | ✅ enrolled | ❌ | ✅ assigned | ✅ | ✅ |
| grades | ❌ | ✅ own | ❌ | ✅ assigned | ✅ | ✅ |
| class-materials | ❌ | ✅ enrolled | ❌ | ✅ assigned | ✅ | ✅ |
| class-management | ❌ | ❌ | ❌ | ✅ lead_ta only | ✅ | ✅ |

### 5.3 Music Modules

| Module | fan | student | alumna | admin | super_admin |
|--------|-----|---------|--------|-------|-------------|
| music-library | 🔒 plus | ✅ | ✅ | ✅ | ✅ |
| practice-room | ❌ | ✅ | ❌ | ✅ | ✅ |
| recordings | 🔒 plus | ✅ | ✅ | ✅ | ✅ |
| sight-reading | ❌ | ✅ | ❌ | ✅ | ✅ |

### 5.4 Organization Modules

| Module | fan | student | alumna | admin | super_admin |
|--------|-----|---------|--------|-------|-------------|
| calendar | ✅ public | ✅ full | ✅ public | ✅ | ✅ |
| directory | ❌ | ✅ | ✅ | ✅ | ✅ |
| documents | ❌ | ✅ | 🔒 limited | ✅ | ✅ |
| tour-info | ❌ | ✅ | ❌ | ✅ | ✅ |

### 5.5 Executive Modules (Glee Club offering + exec_role)

| Module | Exec Role Required |
|--------|--------------------|
| treasurer-dashboard | treasurer |
| budget-management | treasurer |
| tour-management | tour_manager |
| wardrobe-management | wardrobe_manager |
| pr-dashboard | pr_coordinator |
| attendance-management | any exec |
| exec-meetings | any exec |

### 5.6 Admin Modules

| Module | admin | super_admin |
|--------|-------|-------------|
| user-management | ✅ | ✅ |
| role-management | ❌ | ✅ |
| system-settings | ❌ | ✅ |
| analytics | ✅ | ✅ |
| content-moderation | ✅ | ✅ |
| audit-logs | ❌ | ✅ |

### 5.7 Alumni Modules

| Module | fan | student | alumna | admin | super_admin |
|--------|-----|---------|--------|-------|-------------|
| memory-wall | 🔒 plus | ✅ view | ✅ full | ✅ | ✅ |
| mentorship | ❌ | ❌ | ✅ | ✅ | ✅ |
| reunion-rsvp | ❌ | ❌ | ✅ | ✅ | ✅ |
| alumni-directory | ❌ | ❌ | ✅ | ✅ | ✅ |

### 5.8 Fan Modules

| Module | Subscription Required |
|--------|----------------------|
| exclusive-content | plus |
| early-access | plus |
| premium-streams | premium |
| meet-greet-access | premium |

---

## 6. Dashboard UX Requirements

### 6.1 Offering Selector (Required for multi-assignment users)

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Header                                           │
├─────────────────────────────────────────────────────────────┤
│  👤 Jane Doe                     [Viewing: TA — MUS240 ▼]   │
│                                                             │
│  Available Contexts:                                        │
│  • TA — MUS240 Spring 2026                                  │
│  • TA — MUS070 Spring 2026                                  │
│  • Student — MUS101 Spring 2026                             │
│  • Exec — Glee Club 2025-2026 (Treasurer)                   │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Switching offering context updates visible modules + data scope
- Persist selection in URL query param: `/dashboard?offering=uuid`
- Default to most recent/active offering

### 6.2 Locked Module Display

```
┌─────────────────────────────────────────────────────────────┐
│  🔒 Premium Streams                                         │
│  ─────────────────                                          │
│  Access exclusive live concert streams                      │
│                                                             │
│  [Upgrade to Premium →]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Component Architecture

### 7.1 File Structure

```
src/
├── components/
│   └── dashboard/
│       ├── UnifiedDashboard.tsx           # Main container
│       ├── DashboardHeader.tsx            # Header with offering selector
│       ├── DashboardSidebar.tsx           # Dynamic navigation
│       ├── OfferingSelector.tsx           # Context switcher
│       ├── ModuleCard.tsx                 # Module display card
│       ├── LockedModuleCard.tsx           # Upgrade CTA card
│       └── modules/                       # Lazy-loaded module components
│           ├── personal/
│           ├── academy/
│           ├── music/
│           ├── organization/
│           ├── executive/
│           ├── admin/
│           ├── alumni/
│           └── fan/
├── hooks/
│   ├── useUserContext.ts                  # Fetches all user context
│   ├── useOfferingContext.ts              # Manages offering selection
│   ├── usePermissions.ts                  # Permission resolution
│   └── useModuleAccess.ts                 # Module-level access checks
├── contexts/
│   ├── OfferingContext.tsx                # Offering state provider
│   └── PermissionContext.tsx              # Permission state provider
└── lib/
    └── permissions/
        ├── resolver.ts                    # Permission resolution logic
        ├── tierGate.ts                    # Subscription tier checks
        └── types.ts                       # Permission types
```

### 7.2 Key Hook: useUserContext

```typescript
interface UserContext {
  // Identity
  userId: string;
  primaryRole: 'super_admin' | 'admin' | 'student' | 'alumna' | 'fan';
  subscriptionTier: 'free' | 'plus' | 'premium';
  subscriptionStatus: 'none' | 'active' | 'comped' | 'past_due' | 'canceled';
  
  // Enrollments (student access)
  enrollments: Array<{
    offeringId: string;
    courseCode: string;
    semester: string;
    status: string;
  }>;
  
  // TA Assignments (worker access)
  taAssignments: Array<{
    offeringId: string;
    courseCode: string;
    semester: string;
    taType: string;
    isActive: boolean;
  }>;
  
  // Exec Assignments (Glee Club access)
  execAssignments: Array<{
    offeringId: string;
    execRole: string;
    isActive: boolean;
  }>;
  
  // Available offerings for selector
  availableOfferings: Array<{
    offeringId: string;
    label: string;  // "TA — MUS240 Spring 2026"
    type: 'enrollment' | 'ta' | 'exec';
  }>;
}
```

### 7.3 Key Hook: usePermissions

```typescript
interface PermissionResult {
  // Allowed modules with permissions
  allowedModules: Array<{
    moduleId: string;
    canView: boolean;
    canEdit: boolean;
    canManage: boolean;
    scopedToOffering: string | null;
  }>;
  
  // Locked modules with upgrade info
  lockedModules: Array<{
    moduleId: string;
    reason: string;  // "Upgrade to Plus" | "Requires student enrollment"
    requiredTier?: string;
  }>;
  
  // Helper functions
  hasAccess: (moduleId: string) => boolean;
  canEdit: (moduleId: string) => boolean;
  canManage: (moduleId: string) => boolean;
  getUpgradeReason: (moduleId: string) => string | null;
}
```

---

## 8. Migration Path

### Phase 1: Database Setup
1. Create `courses`, `course_offerings`, `course_enrollments` tables
2. Create `ta_assignments`, `exec_assignments` tables
3. Update `dashboard_modules` table (add new columns)
4. Update `role_permissions` table (add scope columns)
5. Add columns to `gw_profiles` (primary_role, subscription_tier/status)

### Phase 2: Data Migration
1. Migrate existing Glee Club as a course with offerings per year
2. Migrate existing exec board roles to `exec_assignments`
3. Seed `dashboard_modules` with all modules
4. Seed `role_permissions` with initial matrix

### Phase 3: Frontend Implementation
1. Implement `useUserContext` hook
2. Implement `useOfferingContext` hook
3. Implement `usePermissions` hook
4. Build `UnifiedDashboard` component
5. Build `OfferingSelector` component
6. Create lazy-loaded module components

### Phase 4: Cleanup
1. Remove old dashboard components (see deletion list below)
2. Remove deprecated boolean flags after verification
3. Update all routes to use unified dashboard

---

## 9. Files to Delete (Post-Migration)

```
src/components/dashboard/MemberDashboard.tsx
src/components/dashboard/AdminDashboard.tsx
src/components/dashboard/SuperAdminDashboard.tsx
src/components/dashboard/AlumnaeDashboard.tsx
src/components/dashboard/AuditionerDashboard.tsx
src/components/dashboard/FanDashboard.tsx
src/components/dashboard/ExecutiveDashboard.tsx
src/pages/MemberDashboardPage.tsx
src/pages/AdminDashboardPage.tsx
src/pages/AlumnaeDashboard.tsx
```

---

## 10. Security Considerations

### 10.1 RLS Policies (Required)

```sql
-- Example: TA can only see students in their assigned offerings
CREATE POLICY "TAs can view enrolled students"
ON course_enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ta_assignments
    WHERE ta_assignments.offering_id = course_enrollments.offering_id
      AND ta_assignments.user_id = auth.uid()
      AND ta_assignments.is_active = true
  )
  OR
  public.has_role(auth.uid(), 'admin')
);
```

### 10.2 Server-Side Validation

- NEVER trust client-side role checks
- All module access must be validated server-side
- Use security definer functions to prevent RLS recursion

---

## 11. Open Questions (To Discuss)

1. **Course Creation Flow**: Who can create new courses/offerings?
2. **TA Self-Service**: Can TAs see which offerings they're assigned to before admin assigns?
3. **Alumna → Fan**: If alumna subscription lapses, do they become fan or stay alumna?
4. **Guest Mode**: Do we need a pre-signup preview for potential fans?
5. **Stripe Integration**: Timeline for replacing manual tier assignment?

---

## 12. Summary: What Changed from v1

| Item | v1 (Remove) | v2 (Use Instead) |
|------|-------------|------------------|
| TA detection | `gw_profiles.is_teaching_assistant` | `ta_assignments` table |
| TA permissions | `gw_profiles.ta_permissions` JSONB | `role_permissions` with scope |
| Role levels | `dashboard_modules.min_role_level` | `role_permissions` + subscription tier |
| Permission scope | Global only | `scope_type` + `scope_id` (offering-scoped) |
| Subscription gate | None | `dashboard_modules.min_subscription_tier` |
| Deny rules | None | `role_permissions.effect = 'deny'` |
| Context switching | None | `OfferingSelector` component |

---

**Implementation Note:** Implement these changes exactly. Do not keep the old boolean TA model or min_role_level.
