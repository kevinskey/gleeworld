import { useState } from "react";
import { Calendar, Grid3X3, List, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarViewSelectorProps {
  activeView: string;
  onViewChange: (view: string) => void;
  className?: string;
}

export const CalendarViewSelector = ({ 
  activeView, 
  onViewChange, 
  className 
}: CalendarViewSelectorProps) => {
  const views = [
    { id: "month", label: "Month", icon: Grid3X3 },
    { id: "week", label: "Week", icon: Calendar },
    { id: "list", label: "List", icon: List },
  ];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Apple-style segmented control */}
      <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/30 backdrop-blur-sm">
        {views.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          
          return (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out",
                "hover:bg-background/80 active:scale-95",
                isActive 
                  ? "bg-background text-foreground shadow-sm border border-border/50" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};