import { Check, CalendarPlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarInfo } from "@/hooks/useCalendars";
import { cn } from "@/lib/utils";
import type { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";

interface CalendarFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryConfig[];
  activeCategoryFilters: CategoryFilter[];
  onToggleCategory: (id: CategoryFilter) => void;
  calendars: CalendarInfo[];
  activeCalendarFilters: string[];
  onToggleCalendar: (id: string) => void;
  /** Admin-only: opens calendar management (settings dialog). */
  onAddCalendar?: () => void;
}

/** Apple Calendar-style filter panel — slides out from the left with
 *  colored round check toggles for categories and calendars. */
export const CalendarFiltersSheet = ({
  open,
  onOpenChange,
  categories,
  activeCategoryFilters,
  onToggleCategory,
  calendars,
  activeCalendarFilters,
  onToggleCalendar,
  onAddCalendar,
}: CalendarFiltersSheetProps) => {
  const Row = ({
    label,
    sub,
    color,
    active,
    onToggle,
  }: {
    label: string;
    sub?: string | null;
    color: string;
    active: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
    >
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 transition-all",
          !active && "opacity-40",
        )}
        style={active
          ? { backgroundColor: color }
          : { border: `2px solid ${color}` }}
      >
        {active && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] truncate", active ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
        {sub && (
          <span className="block text-xs text-muted-foreground truncate">{sub}</span>
        )}
      </span>
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle className="text-lg font-bold">Calendars</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {categories.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categories
              </div>
              {categories.map((cat) => (
                <Row
                  key={cat.id}
                  label={cat.label}
                  color={cat.color}
                  active={activeCategoryFilters.includes(cat.id)}
                  onToggle={() => onToggleCategory(cat.id)}
                />
              ))}
            </>
          )}

          {calendars.length > 0 && (
            <>
              <div className="px-4 pt-5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Calendars
              </div>
              {calendars.map((cal) => (
                <Row
                  key={cal.id}
                  label={cal.name}
                  sub={(cal as any).description || null}
                  color={(cal as any).color || '#708090'}
                  active={activeCalendarFilters.includes(cal.id)}
                  onToggle={() => onToggleCalendar(cal.id)}
                />
              ))}
            </>
          )}
        </div>
        {onAddCalendar && (
          <div className="border-t border-slate-200 px-2 py-2">
            <button
              type="button"
              onClick={onAddCalendar}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              <CalendarPlus className="w-5 h-5 text-muted-foreground" />
              <span className="text-[15px] font-medium text-foreground">Add Calendar</span>
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
