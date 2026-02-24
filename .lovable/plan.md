

## Redesign Arrival/Departure Time Interface

### Problem
The current arrival and departure time inputs use plain HTML `<input type="time">` elements, which look basic and can be inconsistent across browsers. They lack visual polish and don't match the rest of the styled UI.

### Solution
Replace the raw time inputs with a custom, styled time picker that uses dropdown selects for Hour, Minute, and AM/PM -- consistent with the app's design language.

### Design

Each time field will display as a row of three styled select dropdowns:

```text
+--------+  +--------+  +--------+
| 10  v  |  | 30  v  |  | AM  v  |
+--------+  +--------+  +--------+
   Hour       Minute      Period
```

- **Hour**: 1-12
- **Minute**: 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 (5-minute increments for practical scheduling)
- **Period**: AM / PM

The selected values will be converted to/from 24-hour format (e.g., "14:30") for storage in the database, maintaining backward compatibility.

### Changes

**New file: `src/components/ui/time-select.tsx`**
- A reusable `TimeSelect` component with three styled `<Select>` dropdowns (using shadcn Select)
- Props: `value` (HH:mm string), `onChange` (callback), `placeholder`, `className`
- Handles conversion between 12-hour display and 24-hour storage format
- Compact sizing to fit the two-column grid layout

**Edit: `src/components/tour-manager/TourStopLogisticsEditor.tsx`**
- Replace both `<Input type="time">` elements (lines 348-352 and 358-362) with the new `<TimeSelect>` component
- No changes to data storage or save logic -- the component still produces "HH:mm" strings

### Technical Details
- The `TimeSelect` uses three shadcn `<Select>` components side by side
- Parsing: if `value` is "14:30", display Hour=2, Minute=30, Period=PM
- Output: when user picks Hour=3, Minute=15, Period=PM, emit "15:15"
- Edge case: 12 PM = "12:00", 12 AM = "00:00"
- Empty/null values show placeholder text in each dropdown

