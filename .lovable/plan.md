

# Plan: Fix Assistant's Knowledge of Christmas Carol Concert

## Problem Summary
The Glee Assistant doesn't recognize that "Christmas Carol" is a major concert because:

1. **Knowledge base omission** - The system prompt lists major concerts as "Fall (Founder's Day), Spring (Annual Concert), Commencement" but doesn't mention the 100th Annual Spelman Morehouse Christmas Carol
2. **Inconsistent event types in database** - Christmas Carol events are tagged as `performance`, `concert`, or `other` instead of consistently as `concert`
3. **Query logic issue** - The date range filtering may not work correctly due to chained `.or()` clauses

---

## Solution

### 1. Update Knowledge Base (System Prompt)
**File:** `supabase/functions/glee-assistant/index.ts`

Update line 89-90 to explicitly include Christmas Carol:

```text
### Key Dates & Academic Calendar
- Rehearsals: MWF during academic semesters
- Major concerts: 
  - Fall: Founder's Day Concert
  - Winter: Spelman-Morehouse Christmas Carol (December) - The signature annual tradition
  - Spring: Annual Concert
  - Commencement Concert
- Tours typically during spring break or summer
```

### 2. Add Smart Concert Recognition
Enhance the `get_upcoming_events` tool to recognize concert keywords even when `event_type` is inconsistent:

```typescript
// Concert-related keywords to match regardless of event_type
const concertKeywords = ['concert', 'christmas carol', 'annual', 'founder', 'commencement', 'performance'];
```

When searching for concerts, also match these keywords in the title.

### 3. Fix Date Range Query
The current query logic:
```typescript
.or(`start_date.gte.${today},event_date_start.gte.${today}`)
.or(`start_date.lte.${endDateStr},event_date_start.lte.${endDateStr}`)
```

Should use proper AND logic for the date range:
```typescript
.gte('start_date', today)
.lte('start_date', endDateStr)
```

---

## Technical Details

### Files to Modify
- `supabase/functions/glee-assistant/index.ts`

### Specific Changes

| Location | Current | Change |
|----------|---------|--------|
| Lines 89-90 | Major concerts: Fall, Spring, Commencement | Add "Winter: Spelman-Morehouse Christmas Carol (December)" |
| Lines 2716-2722 | Broken `.or()` date query | Fix to proper date range filter |
| Lines 2746-2752 | Event type filter only | Add concert keyword matching |

### Database Recommendation
Consider standardizing `event_type` for Christmas Carol events to `concert` for consistency. Current state:
- "99th Annual Christmas Carol Concert" → `performance`
- "100th Annual Spelman Morehouse Christmas Carol" → `concert`  
- "99th Christmas Carol Broadcast" → `other`

---

## Expected Outcome
After this fix, when a user asks "when is the next glee concert?", the assistant will:
1. Know from its knowledge base that Christmas Carol is a major winter concert
2. Find the December 2026 "100th Annual Spelman Morehouse Christmas Carol" event
3. Return accurate concert information regardless of inconsistent `event_type` values

