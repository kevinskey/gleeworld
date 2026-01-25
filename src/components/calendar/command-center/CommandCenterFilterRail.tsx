import { Music, BookOpen, Church, Mic, Users, Plane, User, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  music: Music,
  'book-open': BookOpen,
  church: Church,
  mic: Mic,
  users: Users,
  plane: Plane,
  user: User,
};

interface CommandCenterFilterRailProps {
  categories: CategoryConfig[];
  activeFilters: CategoryFilter[];
  onToggleFilter: (filter: CategoryFilter) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const CommandCenterFilterRail = ({
  categories,
  activeFilters,
  onToggleFilter,
  isCollapsed,
  onToggleCollapse,
}: CommandCenterFilterRailProps) => {
  return (
    <div 
      className={cn(
        "flex-shrink-0 bg-slate-800 text-white flex flex-col transition-all duration-300 border-r border-slate-700",
        isCollapsed ? "w-14" : "w-52"
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

      {/* Color Legend & Toggles */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map(category => {
          const Icon = CATEGORY_ICONS[category.icon] || Music;
          const isActive = activeFilters.includes(category.id);

          return (
            <button
              key={category.id}
              onClick={() => onToggleFilter(category.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive 
                  ? "bg-slate-700" 
                  : "opacity-50 hover:opacity-75 hover:bg-slate-700/50"
              )}
            >
              {/* Color indicator */}
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: category.color }}
              >
                {isActive && <Check className="h-2.5 w-2.5 text-white" />}
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

      {/* Quick Actions */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <button
          onClick={() => categories.forEach(c => {
            if (!activeFilters.includes(c.id)) onToggleFilter(c.id);
          })}
          className={cn(
            "w-full py-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 transition-colors",
            isCollapsed && "px-1"
          )}
        >
          {isCollapsed ? "All" : "Show All"}
        </button>
        <button
          onClick={() => activeFilters.forEach(f => onToggleFilter(f))}
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
