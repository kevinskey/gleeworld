// Dropdown variant of the scope filter, for headers that need the control on
// one line with the search field. ScopeFilterChips remains for surfaces with
// room to show every scope at once (Media Library).
//
// Chips do not scale: one chip per accessible class means a director in six
// classes gets a control that wraps to three or four lines and pushes the
// search field down the page. A course title like "Survey of African American
// Music" is a 241px chip on its own.

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ScopeKey, ScopeOption } from '@/hooks/useScopeFilter';

interface Props {
  active: ScopeKey;
  options: ScopeOption[];
  onChange: (key: ScopeKey) => void;
  /** Sizing/placement supplied by the header laying this out. */
  className?: string;
}

export function ScopeFilterSelect({ active, options, onChange, className }: Props) {
  return (
    <Select value={active} onValueChange={(v) => onChange(v as ScopeKey)}>
      {/* No visible "Scope" label — the selected value ("All", "Choir",
          a course title) already says what it is, and the label cost a
          whole row of vertical space. */}
      <SelectTrigger className={className} aria-label="Filter by scope">
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.key} value={opt.key}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
