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
}: CommandCenterHeaderProps) => {
  const filtersAvailable = !!(categories && activeCategoryFilters && onToggleCategoryFilter);
  const filtersActive = filtersAvailable && categories && activeCategoryFilters!.length < categories.length;
  return (
    <div className="bg-card border-b border-border  text-foreground px-3 md:px-6 py-3 flex-shrink-0">
      {/* Mobile / Tablet layout */}
      {isMobile ? (
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Month nav + Today + Add Event */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => onNavigateMonth('prev')} 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="min-w-[140px] text-center">
                <h1 className="font-sans normal-case font-bold tracking-tight leading-none text-base uppercase">
                  {format(currentDate, 'MMM yyyy')}
                </h1>
              </div>
              <button 
                onClick={() => onNavigateMonth('next')} 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onToday}
                className="h-9 px-4 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
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
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {(['day', 'week', 'month', 'agenda'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onViewModeChange(m)}
                  className={cn(
                    "px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                    viewMode === m
                      ? "bg-white text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
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
              <div className="min-w-[160px] text-center">
                <h1 className="font-sans normal-case font-bold tracking-tight leading-none text-[15px]">
                  {format(currentDate, 'MMMM yyyy')}
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

          <div className="flex items-center bg-muted rounded-lg p-1">
            {(['day', 'week', 'month', 'agenda'] as const).map((m) => {
              const label = m.charAt(0).toUpperCase() + m.slice(1);
              return (
                <button
                  key={m}
                  onClick={() => onViewModeChange(m)}
                  className={cn(
                    "px-3 h-7 rounded-md text-sm font-medium transition-all inline-flex items-center",
                    viewMode === m
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {filtersAvailable && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
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
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                  Categories
                </div>
                {categories!.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No categories — add one in Settings.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {categories!.map((cat) => {
                      const active = activeCategoryFilters!.includes(cat.id);
                      return (
                        <li key={cat.id}>
                          <button
                            onClick={() => onToggleCategoryFilter!(cat.id)}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted text-left"
                          >
                            <span
                              className="w-4 h-4 rounded inline-flex items-center justify-center shrink-0"
                              style={{ background: active ? cat.color : 'transparent', border: `1px solid ${cat.color}` }}
                            >
                              {active && (
                                <svg viewBox="0 0 20 20" className="w-3 h-3 text-white"><path fill="currentColor" d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 011.4-1.4L8.6 12l6.7-6.7a1 1 0 011.4 0z"/></svg>
                              )}
                            </span>
                            <span className={cn("text-sm", active ? "text-foreground" : "text-muted-foreground")}>
                              {cat.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
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