
# White Background Behind Academy, Shop, and YouTube Sections

## What Will Change
The Glee Academy badge slider, Shop section, and YouTube Channel slider on `/dashboard` will each be wrapped in a white background container with consistent padding, so white space is visible around and between them.

## Steps

1. **Wrap the Glee Academy section** (header button + badge slider, lines 346-357 in `UnifiedDashboard.tsx`) in a `div` with `bg-white` (or `bg-background`) and some padding (e.g., `p-4` or `px-4 py-2`) so white shows around the navy slider.

2. **Wrap the DashboardStoreSection** (line 365) in a similar `bg-white` container with padding. The store section already uses `bg-background` internally, but adding an outer white wrapper ensures consistency and visible white margins.

3. **Wrap the YouTubeChannelSlider** (line 368) in a `bg-white` container with padding so white is visible around the dark gradient video slider.

## Technical Details

All changes are in `src/components/dashboard/UnifiedDashboard.tsx`. Each of the three sections will get a parent `div` like:

```tsx
<div className="bg-white px-4 py-2">
  {/* existing component */}
</div>
```

This keeps the internal dark-themed styling of each component intact while ensuring a clean white background is visible behind and between them.
