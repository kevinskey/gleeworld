import { useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Calendar, CalendarDays, Inbox, List, LayoutGrid, Settings, Filter, Mic } from "lucide-react";
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
  /** Opens the office-hours popout (booking for students, management for admins). */
  onOpenOfficeHours?: () => void;
  /** Opens the agenda/list popout. */
  onOpenAgenda?: () => void;
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
  onOpenOfficeHours,
  onOpenAgenda,
}: CommandCenterHeaderProps) => {
  const filtersAvailable = !!(categories && activeCategoryFilters && onToggleCategoryFilter);
  const filtersActive = filtersAvailable && categories && activeCategoryFilters!.length < categories.length;

  // Apple Calendar-style view switcher. 'agenda' reads as "List".
  const VIEW_LABELS: Record<ViewMode, string> = {
    day: 'Day', week: 'Week', month: 'Month', year: 'Year', agenda: 'List',
  };
  const VIEW_ORDER: ViewMode[] = ['day', 'week', 'month', 'year', 'agenda'];
  const DESKTOP_VIEWS: ViewMode[] = ['day', 'week', 'month', 'year'];

  // Search dictation: Web Speech API where available (Chrome/Edge); on
  // iOS/WKWebView we focus the field so the keyboard's own mic takes over.
  const searchInputRef = useRef<HTMLInputElement>(null);
  const startDictation = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      searchInputRef.current?.focus();
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
        onSearchChange(transcript);
      };
      rec.start();
    } catch {
      searchInputRef.current?.focus();
    }
  };
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
                <h2 className="font-sans normal-case font-bold tracking-tight leading-none text-base">
                  {title}
                </h2>
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
                      ? "bg-card text-foreground font-semibold shadow-sm"
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
                className="pl-9 h-9 w-full bg-muted border-border  text-foreground text-base placeholder:text-muted-foreground focus:bg-card focus:text-foreground focus:placeholder:text-muted-foreground transition-all"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Desktop / tablet — Apple Calendar iPad layout:
           row 1: toolbar (filter/add/settings icons · centered view
           switcher · search); row 2: big bold title + ‹ Today › cluster. */
        <div className="flex flex-col gap-2">
          {/* Row 1: toolbar */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              {filtersAvailable && (
                <button
                  onClick={onOpenFilters}
                  className={cn(
                    "relative h-9 w-9 rounded-full flex items-center justify-center bg-muted hover:bg-accent transition-colors",
                    filtersActive ? "text-primary" : "text-foreground"
                  )}
                  title="Calendars"
                >
                  <CalendarDays className="h-4 w-4" />
                  {filtersActive && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1">
                      {activeCategoryFilters!.length}
                    </span>
                  )}
                </button>
              )}
              {onOpenOfficeHours && (
                <button
                  onClick={onOpenOfficeHours}
                  className="h-9 w-9 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-foreground transition-colors"
                  title="Office hours"
                >
                  <Inbox className="h-4 w-4" />
                </button>
              )}
              {onOpenAgenda && (
                <button
                  onClick={onOpenAgenda}
                  className="h-9 w-9 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-foreground transition-colors"
                  title="List"
                >
                  <List className="h-4 w-4" />
                </button>
              )}
              {canManageEvents && (
                <button
                  onClick={onAddEvent}
                  className="h-9 w-9 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-foreground transition-colors"
                  title="Add event"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
              {canManageEvents && onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="h-9 w-9 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-foreground transition-colors"
                  title="Calendar settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex-1 flex justify-center min-w-0">
              <div className="flex items-center bg-muted rounded-full p-1">
                {DESKTOP_VIEWS.map((m) => (
                  <button
                    key={m}
                    onClick={() => onViewModeChange(m)}
                    className={cn(
                      "px-3 lg:px-3.5 h-7 rounded-full text-sm font-medium transition-all inline-flex items-center",
                      viewMode === m
                        ? "bg-card text-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {VIEW_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex-shrink-0 w-36 lg:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-9 h-9 w-full rounded-full bg-muted border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:bg-card transition-all"
              />
              <button
                type="button"
                onClick={startDictation}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Dictate search"
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Row 2: big title + navigation cluster */}
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-sans normal-case tracking-tight leading-none text-2xl lg:text-3xl">
              {viewMode === 'year' ? (
                <span className="font-bold">{title}</span>
              ) : (
                <>
                  <span className="font-bold">{format(currentDate, 'MMMM')}</span>{' '}
                  <span className="font-normal">{format(currentDate, 'yyyy')}</span>
                </>
              )}
            </h2>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => onNavigateMonth('prev')}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={onToday}
                className="h-8 px-3 rounded-full text-[15px] font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => onNavigateMonth('next')}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};