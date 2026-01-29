
# Plan: Increase Glee Assistant Button Size on Desktop

## Summary
Increase the floating assistant button size from the current 56px to 60–64px on desktop to make the avatar image more visible and impactful.

---

## Recommended Size Options

| Option | Size | Tailwind Classes | Notes |
|--------|------|------------------|-------|
| A (Subtle increase) | 60px | `h-[60px] w-[60px]` | Slightly larger, still subtle |
| B (Recommended) | 64px | `h-16 w-16` | Good for avatar images, still standard |
| C (Bold) | 72px | `h-[72px] w-[72px]` | More prominent, approaches "large FAB" |

---

## Implementation

### File to Modify
`src/components/assistant/GleeAssistant.tsx`

### Change (Line ~678)
Update the button class from:
```tsx
className="hidden sm:flex fixed bottom-6 right-6 h-14 w-14 rounded-full ..."
```

To (using Option B - 64px):
```tsx
className="hidden sm:flex fixed bottom-6 right-6 h-16 w-16 rounded-full ..."
```

### Optional: Scale pulse indicator
Increase pulse indicator from `h-3 w-3` to `h-3.5 w-3.5` to maintain proportion.

---

## Technical Details

- **Current size**: `h-14 w-14` = 56px (Material Design standard FAB)
- **Recommended size**: `h-16 w-16` = 64px (14% larger)
- **Border consideration**: The 2px border reduces visible avatar area, so slightly larger helps
- **No mobile impact**: Mobile uses bottom nav (hidden on phones)

---

## Recommendation

Use **64px (`h-16 w-16`)** — this is a sweet spot that:
- Makes the avatar image more recognizable
- Stays within industry norms for chat widgets
- Provides better touch target for tablet users
