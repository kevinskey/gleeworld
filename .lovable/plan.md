
# Plan: Fix Music Library PDF Viewer Mobile/iPad Header Overlap Issues

## Problem Summary
The PDF viewer in the Music Library is being blocked by headers and footers on mobile phones and iPads in both regular view and Study Mode. The issues stem from multiple overlapping layout concerns.

---

## Issues Identified

### 1. MobilePDFViewer (Regular View)
**File**: `src/components/music-library/MobilePDFViewer.tsx`

| Issue | Details |
|-------|---------|
| Missing top padding | The PDF viewer uses `fixed inset-0` but the floating header at line 34 has no safe-area consideration for the actual content below it |
| PDF content starts at top | The `PDFViewerWithAnnotations` component fills the entire viewport but the floating header (Library/Title/Study buttons) overlaps the PDF content |
| Safe-area not applied to content | Only the header has `safe-top` class but the PDF content area doesn't account for header height |

### 2. SheetMusicViewDialog (Study Mode)
**File**: `src/components/music-library/SheetMusicViewDialog.tsx`

| Issue | Details |
|-------|---------|
| Content positioned below header offset | Line 148 tries to offset using CSS variables but may not account for all devices |
| Close button at `top-20` | The Close/Crop buttons are positioned at `top-20` (80px) which may collide with the annotation toolbar or be too low on some devices |
| No bottom safe-area | Footer/bottom navigation may still overlap the PDF |

### 3. PDFViewerWithAnnotations Toolbars
**File**: `src/components/PDFViewerWithAnnotations.tsx`

| Issue | Details |
|-------|---------|
| Top toolbar at `top-2` | The floating toolbar (line 1034) is positioned at `top-2` which works for desktop but may overlap with MobilePDFViewer's header on mobile |
| Page navigation at `top-2 right-2` | Also positioned at top-right which may conflict with the floating header buttons |

### 4. MobileBottomNav Interference
**File**: `src/components/navigation/MobileBottomNav.tsx`

| Issue | Details |
|-------|---------|
| Fixed bottom navigation | Uses `z-[99999]` and `h-12` which overlaps bottom of PDF viewer |
| MobilePDFViewer doesn't account for it | The PDF viewer should have bottom padding to avoid being covered |

---

## Solution Design

### Fix 1: MobilePDFViewer - Add Proper Spacing

```text
┌─────────────────────────────────┐
│ Safe Area Top                   │ ← env(safe-area-inset-top)
├─────────────────────────────────┤
│ [Library] [Title] [Study]       │ ← Compact header (h-10)
├─────────────────────────────────┤
│                                 │
│     PDF Content Area            │ ← Full height minus header/footer
│                                 │
├─────────────────────────────────┤
│ Safe Area Bottom + Bottom Nav   │ ← env(safe-area-inset-bottom) + 48px
└─────────────────────────────────┘
```

**Changes**:
- Add `pt-12` (or calculated value) to the PDF container to clear the floating header
- Add `pb-16` to clear the MobileBottomNav
- Apply safe-area insets to both top and bottom

### Fix 2: PDFViewerWithAnnotations - Context-Aware Toolbar Position

**Changes**:
- Detect when running inside MobilePDFViewer (via prop or context)
- When in mobile context, position the toolbar lower (e.g., `top-14`) to avoid header overlap
- Alternatively, hide duplicate controls when the parent already provides them

### Fix 3: SheetMusicViewDialog (Study Mode) - Full Screen Handling

**Changes**:
- Ensure the dialog truly fills the screen below any app-level headers
- Add bottom safe-area padding for devices with home indicators
- Reposition the Close/Crop buttons to not conflict with annotation toolbar

### Fix 4: Hide MobileBottomNav During PDF Viewing

**Changes**:
- When MobilePDFViewer is active, the bottom nav should either:
  - Be hidden entirely (since PDF viewer is fullscreen)
  - Or the PDF viewer should have proper bottom padding

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/music-library/MobilePDFViewer.tsx` | Add top/bottom padding for header and bottom nav clearance |
| `src/components/PDFViewerWithAnnotations.tsx` | Add `isInMobileViewer` prop to adjust toolbar positioning |
| `src/components/music-library/SheetMusicViewDialog.tsx` | Fix button positioning and add bottom safe-area |
| `src/components/navigation/MobileBottomNav.tsx` | Hide when on `/music-library` route in viewer mode, or ensure proper z-index handling |

---

## Technical Details

### MobilePDFViewer Updates

```tsx
// Before
<div className="fixed inset-0 z-50 bg-background flex flex-col">
  <div className="absolute top-0 ... z-30 safe-top">
    {/* Header buttons */}
  </div>
  <div className="flex-1 w-full h-full">
    <PDFViewerWithAnnotations ... />
  </div>
</div>

// After
<div className="fixed inset-0 z-50 bg-background flex flex-col">
  {/* Header with safe-area */}
  <div className="flex-shrink-0 safe-top">
    <div className="flex items-center justify-between px-2 py-1.5 h-10 bg-background/95 ...">
      {/* Header buttons */}
    </div>
  </div>
  
  {/* PDF takes remaining space with bottom padding */}
  <div className="flex-1 min-h-0 pb-14" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}>
    <PDFViewerWithAnnotations isInMobileViewer={true} ... />
  </div>
</div>
```

### PDFViewerWithAnnotations Toolbar Adjustment

```tsx
// Add new prop
interface PDFViewerWithAnnotationsProps {
  // ... existing props
  isInMobileViewer?: boolean;
}

// Adjust toolbar position based on context
{!annotationMode && (
  <div 
    className={cn(
      "absolute left-1/2 -translate-x-1/2 z-30",
      isInMobileViewer ? "top-1" : "top-2" // Lower when parent has header
    )}
  >
    {/* Toolbar content */}
  </div>
)}
```

### MobileBottomNav Visibility

```tsx
// In MobileBottomNav, check if we're in fullscreen PDF mode
const location = useLocation();
const isInMusicLibraryViewer = location.pathname === '/music-library';

// Could also use a context or global state to detect PDF viewer mode
// For now, the PDF viewer uses z-50 which is lower than bottom nav's z-99999
// The fix is to add proper padding in the PDF viewer container
```

---

## Testing Checklist

After implementation, verify on:
- [ ] iPhone (with notch/Dynamic Island)
- [ ] iPhone SE (smaller screen)
- [ ] iPad (portrait and landscape)
- [ ] Android phones with gesture navigation

Test scenarios:
- [ ] Open a PDF from Music Library on mobile - header should not cover content
- [ ] Enter Study Mode - annotation toolbar visible and usable
- [ ] Bottom navigation doesn't cover PDF pages
- [ ] Page navigation controls accessible
- [ ] Swipe/tap navigation still works

