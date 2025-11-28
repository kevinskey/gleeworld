# MUS240 Route Migration

This document tracks the migration from `/classes/mus240` to `/mus-240`.

## Completed Updates

### Core Routing
- ✅ `src/App.tsx` - All route definitions updated to `/mus-240` with legacy redirects
- ✅ `src/utils/pageNames.ts` - Page name mappings updated
- ✅ `src/pages/GleeAcademy.tsx` - Navigation updated to use `/mus-240`

### Course Structure
- ✅ `/mus-100` - Music Theory Fundamentals
- ✅ `/mus-210` - Choral Conducting  
- ✅ `/mus-240` - Survey of African American Music

## Files Needing Updates

The following files contain references to `/classes/mus240` that need to be updated to `/mus-240`:

### Component Files (62 total)
1. `src/components/mus240/instructor/ComprehensiveInstructorDashboard.tsx`
2. `src/pages/mus240/AssignmentWeek.tsx`
3. `src/pages/mus240/ClassLanding.tsx`
4. And 59 more files...

## Migration Strategy

### Phase 1: Critical User-Facing Navigation (COMPLETED)
- Updated main routing in App.tsx
- Added legacy redirects for backward compatibility
- Updated GleeAcademy landing page navigation

### Phase 2: Component Navigation (TODO)
All internal component navigation links need to be updated from `/classes/mus240` to `/mus-240`. This can be done with a global find/replace:

**Find:** `/classes/mus240`
**Replace:** `/mus-240`

Files affected: ~62 component files

### Phase 3: Testing
- Test all course navigation flows
- Verify legacy redirects work
- Check all internal links within MUS240 course

## Notes
- Legacy routes (`/classes/mus240`, `/mus240`) redirect to `/mus-240`
- All functionality remains identical, only URLs changed
- No database changes required
