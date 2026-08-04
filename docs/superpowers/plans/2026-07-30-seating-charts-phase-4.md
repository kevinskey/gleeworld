# Seating Charts Phase 4 Implementation Plan

**Goal:** Turn the auto-placement engine and orchestra chair mechanics into real director tools. Adds keep-together / separate groups, front-row + accessibility priority lists, string-partner rotation, and chair-number + principal + stand-partner assignment.

**Architecture:** No new tables. Person groups and flagged lists live under `gw_seating_charts.settings.groups` and `.flags` (jsonb). Chair number + principal + stand-partner fields already exist on `gw_seating_chart_assignments` (`chair_number` column, `properties` jsonb for `is_principal`, `stand_partner_object_id`). String rotation is a pure function over the current arrangement's `violin1/violin2/viola/cello/bass_v` subtyped seats.

## Global Constraints (inherit)
- No new tables, no new deps.
- Group / flag lists live in chart.settings (jsonb) so they travel with the chart, not the arrangement — a group persists across arrangement switches.
- Every new rule respects locked people & seats (Phase 2 invariant).
- Orchestra chair actions are opt-in: only surface when the arrangement has ≥1 orchestra-subtyped chair.

## File Structure

**New:**
- `src/features/seating-charts/placement/groupState.ts` — read/write groups + flag lists via chart.settings
- `src/features/seating-charts/placement/GroupManager.tsx` — dialog: CRUD groups + flag lists
- `src/features/seating-charts/orchestra/orchestraOps.ts` — pure functions: `autoNumberChairs`, `rotateStrings`, `isOrchestraArrangement`
- `src/features/seating-charts/orchestra/OrchestraToolbar.tsx` — toolbar chip when orchestra arrangement detected
- `src/features/seating-charts/__tests__/orchestraOps.test.ts`
- `src/features/seating-charts/__tests__/advancedPlacement.test.ts`

**Modified:**
- `src/features/seating-charts/placement/rules.ts` — add `frontRowPriority`, `accessibilityPriority`, wire groups into `keepTogether` / `separate`; expose `stringRotation`
- `src/features/seating-charts/placement/PlacementDialog.tsx` — surface new rules with per-rule config (group picker, flag-list picker)
- `src/features/seating-charts/engine/PropertiesPanel.tsx` — orchestra assignment section (chair #, principal, stand partner)
- `src/pages/seating-charts/EditorPage.tsx` — mount OrchestraToolbar, GroupManager launcher

## Tasks

### Task 1: chart.settings shape + helpers
Introduce:
```ts
interface PersonGroup { id: string; name: string; member_user_ids: string[]; kind: 'keep_together' | 'separate' | 'front_row' | 'accessibility' }
```
Store `settings.groups: PersonGroup[]`. Helpers to add/remove/rename/reorder + persist through `patchChart({ settings })`.

### Task 2: New / enhanced placement rules
- `frontRowPriority({ …, groups })` — take the union of all groups with kind='front_row', place those people first (sortedSeats already goes top→bottom), then alphabetical fill.
- `accessibilityPriority({ …, groups })` — same idea, plus prefer seats whose `properties.accessibility_only === true`.
- Enhance `keepTogether` and `separate` to accept groups from chart.settings (kind='keep_together' or 'separate') and use them directly.
- `stringRotation({ objects })` — for each string subtype in {violin1, violin2, viola, cello, bass_v}, sort chairs by chair_number (ascending); swap pairs (1↔2, 3↔4, …). Returns object move list, not assignments.

### Task 3: GroupManager UI
Dialog with tabs: Keep together / Separate / Front row / Accessibility. Each tab lists groups of the matching kind. Create, rename, delete. Add-member picker driven by the merged people list.

### Task 4: PlacementDialog changes
- Add new rules to the select.
- When rule uses groups (keep_together, separate, front_row, accessibility), show group summary + "Manage groups" button.
- Preview still computes assignments before applying.

### Task 5: Orchestra chair mechanics
`orchestraOps.ts`:
- `isOrchestraArrangement(objects)` — true if ≥1 object.subtype ∈ {violin1, violin2, viola, cello, bass_v}.
- `autoNumberChairs(objects, assignments)` — assign chair_number in row-major order per section.
- `rotateStrings(objects, assignments)` — swap 1↔2, 3↔4, … within each section by chair_number.
PropertiesPanel — when a single orchestra seat is selected, show: chair # input, principal checkbox, stand-partner picker (dropdown of same-section seats).
OrchestraToolbar — shown when isOrchestraArrangement; two buttons: "Auto-number chairs", "Rotate stands".

### Task 6: Tests + build + commit
- `advancedPlacement.test.ts` — front-row + accessibility preserve locked, respect priority pool.
- `orchestraOps.test.ts` — detection + numbering + rotation.
- `npm run test -- src/features/seating-charts` all pass.
- `npm run build` succeeds.
- Commit.

## Non-goals
Realtime collab, formation designer, native iOS drag polish, per-person height/accessibility persistence (still bring-your-own via groups).
