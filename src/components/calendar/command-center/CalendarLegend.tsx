// Bottom legend bar — visual key for the event-category taxonomy. Pulled
// directly from the tenant's gw_event_categories table via useEventCategories
// so it stays truthful: add a category in Settings → it appears here.

import { useEventCategories } from '@/hooks/useEventCategories';

export function CalendarLegend() {
  const { data: categories = [] } = useEventCategories();

  if (!categories.length) return null;

  return (
    <div className="flex items-center gap-4 lg:gap-6 px-6 py-3 border-t border-border bg-card overflow-x-auto">
      {categories.map((c) => (
        <div key={c.id} className="flex items-center gap-2 shrink-0">
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ background: c.color }}
          />
          <span className="text-sm font-medium text-foreground">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
