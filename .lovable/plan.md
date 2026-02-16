

# Fix MUS 240 Hero Slider Active/Hidden Toggle

## Problem
Two issues prevent the Active toggle from working correctly in the Course Slider Manager:

1. **Admin view filters out hidden slides**: The `CourseSliderManager` uses `useSliderByPlacement()`, which applies `.eq('is_active', true)` on slides. Once a slide is deactivated, it disappears from the admin panel too, making it impossible to re-activate.

2. **Cache invalidation mismatch**: After toggling, `useUpdateSlide` invalidates query key `['universal-slider']` (no second segment), but the actual query uses `['universal-slider', placementKey]`. This means the UI may not refresh after changes.

## Solution

### Step 1: Create an admin-specific slider fetch hook
Add a new hook `useSliderByPlacementAdmin` in `src/hooks/useUniversalSlider.ts` that fetches **all** slides regardless of `is_active` status. This will be used only in the admin manager.

### Step 2: Fix cache invalidation in `useUpdateSlide`
Update the `onSuccess` callback to invalidate all queries starting with `['universal-slider']` using a broader match, so both admin and student caches are refreshed.

### Step 3: Update `CourseSliderManager` to use the admin hook
Switch `src/components/admin/CourseSliderManager.tsx` from `useSliderByPlacement` to the new `useSliderByPlacementAdmin` hook, so hidden slides remain visible and toggleable in the admin interface.

### Step 4: Update `MUS240SliderManager` similarly
Apply the same admin hook change to `src/components/admin/MUS240SliderManager.tsx` if it shares the same pattern.

## Files to Modify
- `src/hooks/useUniversalSlider.ts` -- add admin hook, fix invalidation
- `src/components/admin/CourseSliderManager.tsx` -- use admin hook
- `src/components/admin/MUS240SliderManager.tsx` -- use admin hook (if applicable)

