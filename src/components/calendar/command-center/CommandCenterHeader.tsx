import { ChevronLeft, ChevronRight, Plus, Search, Calendar, List, LayoutGrid, Settings, Filter } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ViewMode } from "./CommandCenterCalendar";
import type { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";

interface CommandCenterHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  onNavigateDay: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onAddEvent: () => void;
  onOpenSettings?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  canManageEvents: boolean;
  isMobile: boolean;
  categories?: CategoryConfig[];
  activeCategoryFilters?: CategoryFilter[];
  onToggleCategoryFilter?: (id: CategoryFilter) => void;
  /** Opens the Apple-style left filters slide-out. */
  onOpenFilters?: () => void;
}

export const CommandCenterHeader = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigateMonth,
  onNavigateDay,
  onToday,
  onAddEvent,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  canManageEvents,
  isMobile,
  categories,
  activeCategoryFilters,
  onToggleCategoryFilter,
  onOpenFilters,
}: CommandCenterHeaderProps) => {
  const filtersAvailable = !!(categories && activeCategoryFilters && onToggleCategoryFilter);
  const filtersActive = filtersAvailable && categories && activeCategoryFilters!.length < categories.length;

  // Apple Calendar-style view switcher. 'agenda' reads as "List".
  const VIEW_LABELS: Record<ViewMode, string> = {
    day: 'Day', week: 'Week', month: 'Month', year: 'Year', agenda: 'List',
  };
  const VIEW_ORDER: ViewMode[] = ['day', 'week', 'month', 'year', 'agenda'];
  const title = viewMode === 'year'
    ? format(currentDate, 'yyyy')
    : format(currentDate, isMobile ? 'MMM yyyy' : 'MMMM yyyy');
  return (
    <div className="bg-card border-b border-border  text-foreground px-3 md:px-6 py-3 flex-shrink-0">
      {/* Mobile / Tablet layout */}
      {isMobile ? (
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Month nav + Today + Add Event */}
          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex items-center">
              <button 
                onClick={() => onNavigateMonth('prev')} 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="min-w-[88px] text-center">
                <h1 className="font-sans normal-case font-bold tracking-tight leading-none text-base">
                  {title}
                </h1>
              </div>
              <button 
                onClick={() => onNavigateMonth('next')} 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={onToday}
                className="h-9 px-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
              >
                Today
              </button>
              {canManageEvents && (
                <Button
                  onClick={onAddEvent}
                  size="sm"
                  className="h-9 w-9 p-0 bg-primary hover:opacity-90 text-primary-foreground font-semibold shadow-sm"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
              {filtersAvailable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onOpenFilters}
                  className={cn(
                    "h-9 w-9 p-0 relative text-muted-foreground hover:text-foreground hover:bg-muted",
                    filtersActive && "text-primary"
                  )}
                  title="Filters"
                >
                  <Filter className="h-5 w-5" />
                  {filtersActive && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1">
                      {activeCategoryFilters!.length}
                    </span>
                  )}
                </Button>
              )}
              {canManageEvents && onOpenSettings && (
                <Button
                  onClick={onOpenSettings}
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Calendar settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Row 2: View toggle + Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-full p-0.5">
              {VIEW_ORDER.map((m) => (
                <button
                  key={m}
                  onClick={() => onViewModeChange(m)}
                  className={cn(
                    "px-2 py-1.5 rounded-full text-xs font-medium transition-all",
                    viewMode === m
                      ? "bg-white text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {VIEW_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 w-full bg-muted border-border  text-foreground text-base placeholder:text-muted-foreground focus:bg-white focus:text-foreground focus:placeholder:text-muted-foreground transition-all"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Desktop layout: single row */
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <button 
                onClick={() => onNavigateMonth('prev')} 
                className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-[180px] text-center">
                <h1 className="font-sans normal-case tracking-tight leading-none text-xl">
                  {viewMode === 'year' ? (
                    <span className="font-bold">{title}</span>
                  ) : (
                    <>
                      <span className="font-bold">{format(currentDate, 'MMMM')}</span>{' '}
                      <span className="font-normal text-muted-foreground">{format(currentDate, 'yyyy')}</span>
                    </>
                  )}
                </h1>
              </div>
              <button 
                onClick={() => onNavigateMonth('next')} 
                className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={onToday}
              className="h-9 px-4 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
            >
              Today
            </button>
          </div>

          <div className="flex items-center bg-muted rounded-full p-1">
            {VIEW_ORDER.map((m) => (
              <button
                key={m}
                onClick={() => onViewModeChange(m)}
                className={cn(
                  "px-3.5 h-7 rounded-full text-sm font-medium transition-all inline-flex items-center",
                  viewMode === m
                    ? "bg-white text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {VIEW_LABELS[m]}
              </button>
            ))}
          </div>

          {filtersAvailable && (
            <Button
              variant="outline"
              onClick={onOpenFilters}
              className={cn(
                "h-9 gap-2 text-sm font-medium",
                filtersActive && "border-primary text-primary"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {filtersActive && (
                <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-1">
                  {activeCategoryFilters!.length}/{categories!.length}
                </span>
              )}
            </Button>
          )}

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 w-48 md:w-64 bg-muted border-border text-sm text-foreground placeholder:text-muted-foreground placeholder:text-sm focus:bg-white focus:text-foreground focus:placeholder:text-muted-foreground transition-all"
              />
            </div>
            {canManageEvents && (
              <Button
                onClick={onAddEvent}
                className="h-9 px-3 bg-primary hover:opacity-90 text-primary-foreground text-sm font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Add Event</span>
              </Button>
            )}
            {canManageEvents && onOpenSettings && (
              <Button
                onClick={onOpenSettings}
                variant="ghost"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Calendar settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};