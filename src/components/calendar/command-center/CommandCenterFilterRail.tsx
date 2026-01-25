import { Music, BookOpen, Church, Mic, Users, Plane, User, ChevronLeft, ChevronRight, Check, Calendar, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";
import { CalendarInfo } from "@/hooks/useCalendars";
import { Separator } from "@/components/ui/separator";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  music: Music,
  'book-open': BookOpen,
  church: Church,
  mic: Mic,
  users: Users,
  plane: Plane,
  user: User,
  clipboard: ClipboardList,
  calendar: Calendar,
};

interface CommandCenterFilterRailProps {
  categories: CategoryConfig[];
  calendars: CalendarInfo[];
  activeCategoryFilters: CategoryFilter[];
  activeCalendarFilters: string[];
  onToggleCategoryFilter: (filter: CategoryFilter) => void;
  onToggleCalendarFilter: (calendarId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const CommandCenterFilterRail = ({
  categories,
  calendars,
  activeCategoryFilters,
  activeCalendarFilters,
  onToggleCategoryFilter,
  onToggleCalendarFilter,
  isCollapsed,
  onToggleCollapse,
}: CommandCenterFilterRailProps) => {
  return (
    <div 
      className={cn(
        "flex-shrink-0 bg-slate-800 text-white flex flex-col transition-all duration-300 border-r border-slate-700",
        isCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        {!isCollapsed && (
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Filters
          </h3>
        )}
        <button
          onClick={onToggleCollapse}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Categories Section */}
        <div className="p-2">
          {!isCollapsed && (
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
              Categories
            </h4>
          )}
          <div className="space-y-1">
            {categories.map(category => {
              const Icon = CATEGORY_ICONS[category.icon] || Music;
              const isActive = activeCategoryFilters.includes(category.id);

              return (
                <button
                  key={category.id}
                  onClick={() => onToggleCategoryFilter(category.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    isActive 
                      ? "bg-slate-700" 
                      : "opacity-50 hover:opacity-75 hover:bg-slate-700/50"
                  )}
                >
                  {/* Color indicator */}
                  <div 
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: category.color }}
                  >
                    {isActive && <Check className="h-2 w-2 text-white" />}
                  </div>

                  {/* Icon */}
                  <Icon className="h-4 w-4 flex-shrink-0 text-slate-300" />

                  {/* Label */}
                  {!isCollapsed && (
                    <span className="text-sm font-medium text-slate-200 truncate flex-1 text-left">
                      {category.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendars Section */}
        {calendars.length > 0 && (
          <>
            <Separator className="bg-slate-700 my-2" />
            <div className="p-2">
              {!isCollapsed && (
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                  Calendars
                </h4>
              )}
              <div className="space-y-1">
                {calendars.map(calendar => {
                  const isActive = activeCalendarFilters.includes(calendar.id);

                  return (
                    <button
                      key={calendar.id}
                      onClick={() => onToggleCalendarFilter(calendar.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                        isActive 
                          ? "bg-slate-700" 
                          : "opacity-50 hover:opacity-75 hover:bg-slate-700/50"
                      )}
                    >
                      {/* Color indicator */}
                      <div 
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: calendar.color || '#708090' }}
                      >
                        {isActive && <Check className="h-2 w-2 text-white" />}
                      </div>

                      {/* Icon */}
                      <Calendar className="h-4 w-4 flex-shrink-0 text-slate-300" />

                      {/* Label */}
                      {!isCollapsed && (
                        <span className="text-xs font-medium text-slate-200 truncate flex-1 text-left">
                          {calendar.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <button
          onClick={() => {
            categories.forEach(c => {
              if (!activeCategoryFilters.includes(c.id)) onToggleCategoryFilter(c.id);
            });
            calendars.forEach(c => {
              if (!activeCalendarFilters.includes(c.id)) onToggleCalendarFilter(c.id);
            });
          }}
          className={cn(
            "w-full py-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 transition-colors",
            isCollapsed && "px-1"
          )}
        >
          {isCollapsed ? "All" : "Show All"}
        </button>
        <button
          onClick={() => {
            activeCategoryFilters.forEach(f => onToggleCategoryFilter(f));
            activeCalendarFilters.forEach(f => onToggleCalendarFilter(f));
          }}
          className={cn(
            "w-full py-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 transition-colors",
            isCollapsed && "px-1"
          )}
        >
          {isCollapsed ? "–" : "Hide All"}
        </button>
      </div>
    </div>
  );
};
