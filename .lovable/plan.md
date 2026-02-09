

## Fix: "Due This Week" Assignment Cards Getting Cut Off

The assignment cards in the "Due This Week" section use a single-row flex layout that forces the title, status badge ("Overdue"), and action button ("Start"/"Discuss") onto one line. On narrower screens (including the main content area squeezed by the sidebar), the badges and buttons overflow and get clipped.

### Proposed Redesign

Switch from a single-row layout to a **stacked two-row card** layout:

- **Row 1**: Assignment title (full width, no truncation) and due date/points info
- **Row 2**: Status badge (left-aligned) and action button (right-aligned)

This ensures nothing gets clipped regardless of title length or viewport width.

---

### Technical Details

**File**: `src/components/academy/TeachingFirstHome.tsx` (lines ~894-935)

**Current layout**:
```text
[Title + due date] ---- [Overdue badge] [Start button]
```
All in one `flex` row with `justify-between`, causing overflow.

**New layout**:
```text
[Title (full width)]
[Due date / points]
[Overdue badge]              [Start button -->]
```

Changes:
1. Replace the outer `flex items-center justify-between` with a vertical `space-y-2` stack
2. Move title and metadata to the top, full-width
3. Place the badge and button in a separate `flex items-center justify-between` row at the bottom
4. Remove `truncate` from the title so long names wrap naturally
5. Keep existing color logic (red tint for overdue, neutral for upcoming)

This is a single-file change affecting only the card markup within the "Due This Week" section.

