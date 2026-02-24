

# Redesign MUS 070 Homepage to Match Course Selection "Liquid Glass" Aesthetic

## Overview
Transform the MUS 070 (Glee Club) course homepage from its current white/Spelman Navy look into the contemporary "Deep Sea Glassmorphism" design used on the Course Selection page. This applies to both the desktop view (StudentDossierHome) and mobile view (MobileCourseLanding).

## Design Language (from Course Selection page)
- Deep navy-to-charcoal mesh gradient background with ambient blue glow orbs
- Film grain noise overlay at 3% opacity
- Glass cards: `bg-white/[0.03] backdrop-blur-xl border border-white/10` with inner shadow highlights
- White typography on dark backgrounds, sky-400 accents
- Hover effects: soft blue radial glows, `scale-[1.02]`
- Plus Jakarta Sans / Inter font family for headers
- Rounded-2xl card corners

---

## Desktop (StudentDossierHome.tsx)

### Background and Container
- Replace the current `space-y-6` wrapper with a full deep-sea gradient container matching CourseSelection's `linear-gradient(160deg, #0a1628, #0d1f3c, #081430, #060e1f, #030812)`
- Add the ambient glow orbs (radial gradient blurs) and film grain overlay
- Keep the AdvertisingHero at the top

### Cards Restyling
- "What's Due Next" card: glass card styling (`bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl`)
- Upcoming Events calendar grid: glass cards with sky-400 date accents
- Right sidebar (Instructor card, Announcements): glass card styling
- All text converted to white/slate-300/slate-400 palette
- Badges and status indicators use sky-400 and appropriate semantic colors on dark backgrounds

### Assignments List
- Overdue items: soft red glow border instead of red background
- Submitted/graded: emerald glow accents
- "Start" buttons: glass-outlined style with sky-400 text

### Current Module Card
- Glass card with the 60/40 split layout preserved
- Module title in white, description in slate-400

---

## Mobile (MobileCourseLanding.tsx)

### Background
- Replace `bg-white` with the same deep-sea gradient background
- Title bar: `bg-white/[0.05] backdrop-blur-xl border-b border-white/10` instead of `bg-white border-b border-gray-200`
- Text colors: white for titles, slate-400 for secondary text

### Quick Action Buttons
- Glass card style: `bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl`
- Icons in sky-400, labels in white/slate-300

### Cards (Playlist, Module, Assignments, Schedule)
- All cards converted to glass styling
- Remove `border-0 shadow-sm bg-card` in favor of glass aesthetic
- Buttons: outlined with white/10 borders and sky-400 text

### Check-In Button
- Keep prominent but style as a glowing glass button with sky-400 accent

---

## UnifiedCoursePage.tsx Changes
- Update the `isMus070Page` conditional from `bg-[#003666]` to the full deep-sea gradient (inline style matching CourseSelection)
- Ensure the left sidebar remains light/card-themed (it's a navigation element that stays readable)

---

## Technical Details

### Files to Modify
1. **`src/components/academy/UnifiedCoursePage.tsx`** -- Change MUS 070 background from `bg-[#003666]` to the deep-sea gradient with glow orbs
2. **`src/components/academy/StudentDossierHome.tsx`** -- Restyle all cards, text, and layout to glass aesthetic for MUS 070
3. **`src/components/course/MobileCourseLanding.tsx`** -- Restyle mobile landing with deep-sea background and glass cards for MUS 070

### Approach
- Use the `isMus070` flag already present in both components to conditionally apply the glass theme
- Non-MUS-070 courses remain unchanged
- Reuse the exact gradient values, glow orb positions, and card styles from `CourseSelection.tsx` for visual consistency
- Keep all existing functionality (Check-In, Playlist, Quick Actions, Assignments, Schedule Form) intact -- only the visual skin changes
