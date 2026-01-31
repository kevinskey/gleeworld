
# Update MUS 070 Performance Weighting

## Summary
Update the grading configuration to break down the 30% Performances component into specific weighted events for Spring 2026.

## Performance Breakdown (30% Total)

| Performance | Weight |
|-------------|--------|
| Spring Concert | 10% |
| Graduation/Commencement | 5% |
| Founders Day | 4% |
| TBD Performance 1 | 5.5% |
| TBD Performance 2 | 5.5% |
| **Total** | **30%** |

## Implementation Approach

There are two ways to implement this:

**Option A: Expand to Individual Line Items**
Break out each performance as its own grading component in the configuration. This gives maximum visibility but changes the grading breakdown display.

**Option B: Add Sub-Components to Existing Structure**
Extend the `GradingComponent` interface to support nested sub-items, keeping "Performances" as the main 30% category but showing the individual event weights as details.

**Recommendation:** Option A is simpler and more transparent for students—they'll see exactly how each performance is weighted.

## Changes Required

### 1. Update `src/config/courseGradingConfig.ts`
Replace the single "Performances" component with five individual performance entries:

```typescript
components: [
  { component: 'Attendance', weight: 45, description: 'Required attendance at all scheduled rehearsals' },
  { component: 'Spring Concert', weight: 10, description: 'Flagship Spring 2026 performance' },
  { component: 'Graduation/Commencement', weight: 5, description: 'Commencement ceremony performance' },
  { component: 'Founders Day', weight: 4, description: 'Spelman Founders Day celebration' },
  { component: 'TBD Performance 1', weight: 5.5, description: 'Community outreach, AUC collaboration, or festival' },
  { component: 'TBD Performance 2', weight: 5.5, description: 'Community outreach, AUC collaboration, or festival' },
  { component: 'Sight Singing – Music Reading', weight: 15, description: '2 weekly sight singing quizzes + 30 min/week on SightReadingFactory.com' },
  { component: 'Sectionals', weight: 10, description: 'Attendance and participation in section rehearsals' }
]
```

### 2. Update `supabase/functions/glee-assistant/index.ts`
Sync the AI assistant's knowledge base with the new performance weighting structure.

### 3. Redeploy Edge Function
Deploy the updated `glee-assistant` function to apply the changes.

---

## Technical Note
The current `GradingComponent` interface uses `weight: number`, so the 5.5% values will work correctly. The student grading view will automatically reflect these changes once the configuration is updated.
