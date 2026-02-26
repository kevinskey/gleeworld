import { ChevronLeft, ChevronRight, Plus, Search, Calendar, List, LayoutGrid } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ViewMode } from "./CommandCenterCalendar";

interface CommandCenterHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  onNavigateDay: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onAddEvent: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  canManageEvents: boolean;
  isMobile: boolean;
}

export const CommandCenterHeader = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigateMonth,
  onNavigateDay,
  onToday,
  onAddEvent,
  searchQuery,
  onSearchChange,
  canManageEvents,
  isMobile,
}: CommandCenterHeaderProps) => {
  return (
    <div className="bg-[#003666] text-white px-3 md:px-6 py-3 flex-shrink-0">
      {/* Mobile / Tablet layout */}
      {isMobile ? (
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Month nav + Today + Add Event */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => onNavigateMonth('prev')} 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="min-w-[140px] text-center">
                <h1 className="text-xl font-bold tracking-tight uppercase">
                  {format(currentDate, 'MMM yyyy')}
                </h1>
              </div>
              <button 
                onClick={() => onNavigateMonth('next')} 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onToday}
                className="h-9 px-4 rounded-lg text-sm font-semibold bg-[#B8860B] text-white hover:bg-[#9A7209] transition-all shadow-sm"
              >
                Today
              </button>
              {canManageEvents && (
                <Button
                  onClick={onAddEvent}
                  size="sm"
                  className="h-9 w-9 p-0 bg-[#B8860B] hover:bg-[#9A7209] text-white font-semibold shadow-sm"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Row 2: View toggle + Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/10 rounded-lg p-0.5">
              <button
                onClick={() => onViewModeChange('month')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'month' 
                    ? "bg-white text-[#003366]" 
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Month</span>
              </button>
              <button
                onClick={() => onViewModeChange('agenda')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'agenda' 
                    ? "bg-white text-[#003366]" 
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <List className="h-4 w-4" />
                <span>Agenda</span>
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 w-full bg-white/10 border-white/20 text-white text-base placeholder:text-white/50 focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 transition-all"
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
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-[180px] text-center">
                <h1 className="text-xl font-bold tracking-tight">
                  {format(currentDate, 'MMMM yyyy')}
                </h1>
              </div>
              <button 
                onClick={() => onNavigateMonth('next')} 
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button 
              onClick={onToday}
              className="h-8 px-4 rounded-lg text-sm font-semibold bg-[#B8860B] text-white hover:bg-[#9A7209] transition-all shadow-sm"
            >
              Today
            </button>
          </div>

          <div className="flex items-center bg-white/10 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('month')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === 'month' 
                  ? "bg-white text-[#003366]" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Month</span>
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === 'week' 
                  ? "bg-white text-[#003366]" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span>Week</span>
            </button>
            <button
              onClick={() => onViewModeChange('agenda')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === 'agenda' 
                  ? "bg-white text-[#003366]" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <List className="h-4 w-4" />
              <span>Agenda</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-8 w-48 md:w-64 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 transition-all"
              />
            </div>
            {canManageEvents && (
              <Button
                onClick={onAddEvent}
                className="h-8 px-3 bg-[#B8860B] hover:bg-[#9A7209] text-white font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Add Event</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};