import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  QrCode, 
  Plane, 
  Music, 
  Church, 
  Calendar, 
  ChevronRight,
  ExternalLink,
  Users
} from "lucide-react";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CategoryConfig, CategoryFilter } from "./CommandCenterCalendar";
import { CommandCenterEventCard } from "./CommandCenterEventCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'courses', label: 'Course Pages', icon: BookOpen, route: '/academy', color: '#B8860B' },
  { id: 'attendance', label: 'Attendance QR', icon: QrCode, route: '/attendance', color: '#003366' },
  { id: 'tour', label: 'Tour Manager', icon: Plane, route: '/tour', color: '#CD853F' },
  { id: 'repertoire', label: 'Repertoire', icon: Music, route: '/repertoire', color: '#8B0000' },
  { id: 'liturgy', label: 'Liturgical Planner', icon: Church, route: '/liturgy', color: '#6B4C9A' },
];

interface DailyRunSheetProps {
  selectedDate: Date;
  events: GleeWorldEvent[];
  getCategoryForEvent: (event: GleeWorldEvent) => CategoryFilter;
  categoryConfigs: CategoryConfig[];
  onEventDeleted?: () => void;
}

export const DailyRunSheet = ({
  selectedDate,
  events,
  getCategoryForEvent,
  categoryConfigs,
  onEventDeleted,
}: DailyRunSheetProps) => {
  const navigate = useNavigate();
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});

  // Fetch quick attendance counts for all events on this day
  useEffect(() => {
    const fetchCounts = async () => {
      if (events.length === 0) {
        setAttendanceCounts({});
        return;
      }
      const eventIds = events.map((e) => e.id);
      const { data } = await supabase
        .from("gw_event_attendance")
        .select("event_id")
        .in("event_id", eventIds)
        .in("attendance_status", ["present", "checked_in"]);

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.event_id] = (counts[row.event_id] || 0) + 1;
      }
      setAttendanceCounts(counts);
    };
    fetchCounts();
  }, [events]);

  const getCategoryConfig = (category: CategoryFilter) => {
    return categoryConfigs.find(c => c.id === category);
  };

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#003366] text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <div>
            <h2 className="text-lg font-bold">Daily Run Sheet</h2>
            <p className="text-sm text-white/70">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No events scheduled</p>
              <p className="text-slate-400 text-sm mt-1">
                Select a date to view the run sheet
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Today's Schedule
                </span>
                <span className="text-xs text-slate-400">
                  {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
                </span>
              </div>
              {sortedEvents.map((event) => {
                const category = getCategoryForEvent(event);
                const config = getCategoryConfig(category);
                return (
                  <div key={event.id}>
                    <CommandCenterEventCard
                      event={event}
                      categoryColor={config?.color || '#708090'}
                      categoryIcon={config?.icon || 'calendar'}
                      compact={false}
                      onEventDeleted={onEventDeleted}
                      onClick={() => {
                        if (event.course_id) {
                          navigate(`/academy/course/${event.course_id}`);
                        } else if (category === 'liturgy') {
                          navigate('/liturgy');
                        } else if (category === 'tour') {
                          navigate('/tour');
                        }
                      }}
                    />
                    {attendanceCounts[event.id] > 0 && (
                      <div className="flex items-center gap-1 mt-1 ml-11 text-[11px] text-slate-500">
                        <Users className="h-3 w-3" />
                        <span>{attendanceCounts[event.id]} checked in</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="border-t border-slate-200 bg-slate-50 p-4 flex-shrink-0">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className={cn(
                  "h-auto py-2.5 px-3 flex items-center gap-2 justify-start",
                  "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                )}
                onClick={() => navigate(action.route)}
              >
                <div 
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: action.color }}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-700 truncate">
                  {action.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 ml-auto flex-shrink-0" />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
