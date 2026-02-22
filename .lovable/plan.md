

## Change Mobile Bottom Nav Academy Icon

**What**: Replace the `Music` (music note) icon currently used for the Academy button in the mobile bottom navigation with the `BookOpen` icon -- the same icon used on the Course Selection page header.

**Why**: The `Music` icon is generic and doesn't clearly represent the Academy. The `BookOpen` icon matches the Course Selection page's own branding and is visually distinct from the Musical Toolkit icon already in the nav.

### Technical Details

**File to modify**: `src/components/navigation/MobileBottomNav.tsx`

1. Replace the `Music` import with `BookOpen` from `lucide-react` (line 1)
2. Change `<Music className="h-7 w-7" />` to `<BookOpen className="h-7 w-7" />` in the Academy button (around line 98)

This is a single-line icon swap -- no logic changes needed.
