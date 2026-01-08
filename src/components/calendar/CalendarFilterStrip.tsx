import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Plus, Check, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Calendar {
  id: string;
  name: string;
  color: string;
  is_visible: boolean;
  is_default?: boolean;
  created_by?: string | null;
}

interface Course {
  id: string;
  title: string;
  course_code: string | null;
}

interface CalendarFilterStripProps {
  onCalendarsChange: (selectedCalendarIds: string[]) => void;
  onCalendarColorUpdated?: () => void;
}

export const CalendarFilterStrip = ({
  onCalendarsChange,
  onCalendarColorUpdated,
}: CalendarFilterStripProps) => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [calendarControlsEnabled, setCalendarControlsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const presetColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'
  ];

  useEffect(() => {
    loadCalendars();
    loadCourses();
    if (user) {
      loadUserPreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    onCalendarsChange(selectedCalendarIds);
  }, [selectedCalendarIds, onCalendarsChange]);

  const loadCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('id, name, color, is_visible, is_default, created_by')
        .eq('is_visible', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setCalendars(data || []);
      const initialIds = (data || []).map((cal: any) => cal.id);
      setSelectedCalendarIds(initialIds);
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast({
        title: "Error",
        description: "Failed to load calendars",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, title, course_code')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('calendar_controls_enabled, selected_calendars')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCalendarControlsEnabled(data.calendar_controls_enabled);
        if (data.selected_calendars && data.selected_calendars.length > 0) {
          let systemCalendarIds: string[] = [];
          if (calendars.length > 0) {
            systemCalendarIds = calendars.filter(cal => !cal.created_by).map(cal => cal.id);
          } else {
            const { data: systemCalendars } = await supabase
              .from('gw_calendars')
              .select('id')
              .is('created_by', null)
              .eq('is_visible', true);
            systemCalendarIds = (systemCalendars || []).map(c => c.id);
          }
          const merged = Array.from(new Set([...data.selected_calendars, ...systemCalendarIds]));
          setSelectedCalendarIds(merged);
          await saveSelectedCalendars(merged);
        }
      } else {
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          calendar_controls_enabled: true,
          selected_calendars: []
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  const saveSelectedCalendars = async (newSelectedIds: string[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          selected_calendars: newSelectedIds,
          calendar_controls_enabled: calendarControlsEnabled
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving calendar preferences:', error);
    }
  };

  const toggleCalendar = async (calendarId: string) => {
    if (!calendarControlsEnabled) {
      toast({
        title: "Access Restricted",
        description: "Calendar controls have been disabled by your administrator",
        variant: "destructive"
      });
      return;
    }

    const newSelectedIds = selectedCalendarIds.includes(calendarId)
      ? selectedCalendarIds.filter(id => id !== calendarId)
      : [...selectedCalendarIds, calendarId];

    setSelectedCalendarIds(newSelectedIds);
    await saveSelectedCalendars(newSelectedIds);
  };

  const toggleAll = async () => {
    if (!calendarControlsEnabled) return;
    const newSelectedIds = selectedCalendarIds.length === calendars.length
      ? []
      : calendars.map(cal => cal.id);
    setSelectedCalendarIds(newSelectedIds);
    await saveSelectedCalendars(newSelectedIds);
  };

  const updateCalendarColor = async (calendarId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('gw_calendars')
        .update({ color })
        .eq('id', calendarId);

      if (error) throw error;

      setCalendars((prev) =>
        prev.map((cal) => (cal.id === calendarId ? { ...cal, color } : cal))
      );

      window.dispatchEvent(
        new CustomEvent('gw:calendar-color-updated', {
          detail: { calendarId, color },
        })
      );

      onCalendarColorUpdated?.();

      toast({
        title: "Success",
        description: "Calendar color updated",
      });
    } catch (error) {
      console.error('Error updating calendar color:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar color",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground animate-pulse">
        Loading...
      </div>
    );
  }

  if (!calendarControlsEnabled) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Settings className="h-3 w-3" />
        <span className="truncate">Controls disabled</span>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground">
        No calendars
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-full overflow-hidden flex-wrap">
      {/* Calendar Toggles as Clean Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 flex-1 min-w-0">
        {calendars.map(calendar => {
          const isSelected = selectedCalendarIds.includes(calendar.id);
          return (
            <DropdownMenu key={calendar.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleCalendar(calendar.id);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all border flex-shrink-0",
                    isSelected
                      ? "bg-background border-border shadow-sm"
                      : "bg-muted/30 border-transparent opacity-50 hover:opacity-80"
                  )}
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: calendar.color,
                  }}
                >
                  {isSelected && <Check className="w-3 h-3 text-foreground" />}
                  <span className="truncate max-w-[100px]">{calendar.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover z-50 p-2 w-48">
                <DropdownMenuLabel className="text-xs font-medium">
                  Change color
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="grid grid-cols-6 gap-1.5 p-1 pt-2">
                  {presetColors.map((color) => (
                    <DropdownMenuItem
                      key={color}
                      asChild
                      onSelect={(e) => {
                        e.preventDefault();
                        updateCalendarColor(calendar.id, color);
                      }}
                      className="p-0 h-auto focus:bg-transparent"
                    >
                      <button
                        type="button"
                        className={cn(
                          "w-5 h-5 rounded border-2 transition-all hover:scale-110 cursor-pointer",
                          calendar.color?.toLowerCase() === color.toLowerCase()
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Set ${calendar.name} color to ${color}`}
                      />
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>

      {/* All/None Toggle */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          toggleAll();
        }}
        className="text-xs h-7 px-2 flex-shrink-0"
      >
        {selectedCalendarIds.length === calendars.length ? 'Hide All' : 'Show All'}
      </Button>

      {/* Courses Dropdown */}
      {courses.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7 px-2 gap-1.5 flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Courses</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50 w-64">
            <DropdownMenuLabel className="text-xs">Glee Academy Courses</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {courses.map(course => (
              <DropdownMenuItem
                key={course.id}
                className="cursor-pointer text-xs"
                onClick={() => {
                  // TODO: Filter calendar by course when course calendars are implemented
                  toast({
                    title: course.title,
                    description: `Course calendar for ${course.course_code || 'course'}`,
                  });
                }}
              >
                <span className="text-muted-foreground mr-2 font-mono">{course.course_code}</span>
                {course.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Settings Gear */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};