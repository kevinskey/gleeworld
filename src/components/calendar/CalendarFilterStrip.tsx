import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
interface Calendar {
  id: string;
  name: string;
  color: string;
  is_visible: boolean;
  is_default?: boolean;
  created_by?: string | null;
}
interface CalendarFilterStripProps {
  onCalendarsChange: (selectedCalendarIds: string[]) => void;
}
export const CalendarFilterStrip = ({
  onCalendarsChange
}: CalendarFilterStripProps) => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [calendarControlsEnabled, setCalendarControlsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const presetColors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'];
  useEffect(() => {
    loadCalendars();
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
      const {
        data,
        error
      } = await supabase.from('gw_calendars').select('id, name, color, is_visible, is_default, created_by').eq('is_visible', true).order('name', {
        ascending: true
      });
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
  const loadUserPreferences = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('user_preferences').select('calendar_controls_enabled, selected_calendars').eq('user_id', user.id).maybeSingle();
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
            const {
              data: systemCalendars
            } = await supabase.from('gw_calendars').select('id').is('created_by', null).eq('is_visible', true);
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
      const {
        error
      } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        calendar_controls_enabled: true,
        selected_calendars: []
      }, {
        onConflict: 'user_id'
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };
  const saveSelectedCalendars = async (newSelectedIds: string[]) => {
    if (!user) return;
    try {
      const {
        error
      } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        selected_calendars: newSelectedIds,
        calendar_controls_enabled: calendarControlsEnabled
      }, {
        onConflict: 'user_id'
      });
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
    const newSelectedIds = selectedCalendarIds.includes(calendarId) ? selectedCalendarIds.filter(id => id !== calendarId) : [...selectedCalendarIds, calendarId];
    setSelectedCalendarIds(newSelectedIds);
    await saveSelectedCalendars(newSelectedIds);
  };
  const toggleAll = async () => {
    if (!calendarControlsEnabled) return;
    const newSelectedIds = selectedCalendarIds.length === calendars.length ? [] : calendars.map(cal => cal.id);
    setSelectedCalendarIds(newSelectedIds);
    await saveSelectedCalendars(newSelectedIds);
  };
  const updateCalendarColor = async (calendarId: string, color: string) => {
    try {
      const {
        error
      } = await supabase.from('gw_calendars').update({
        color
      }).eq('id', calendarId);
      if (error) throw error;
      setCalendars(prev => prev.map(cal => cal.id === calendarId ? {
        ...cal,
        color
      } : cal));
      toast({
        title: "Success",
        description: "Calendar color updated"
      });
    } catch (error) {
      console.error('Error updating calendar color:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar color",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="flex items-center gap-1 text-[10px] text-muted-foreground animate-pulse">
        Loading...
      </div>;
  }
  if (!calendarControlsEnabled) {
    return <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Settings className="h-3 w-3" />
        <span className="truncate">Controls disabled</span>
      </div>;
  }
  if (calendars.length === 0) {
    return <div className="text-[10px] text-muted-foreground">
        No calendars
      </div>;
  }
  return <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
      {/* Mobile: horizontal scroll strip */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5 flex-1 min-w-0">
        {calendars.map(calendar => {
        const isSelected = selectedCalendarIds.includes(calendar.id);
        return <ContextMenu key={calendar.id}>
              <ContextMenuTrigger asChild>
                <button type="button" onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              toggleCalendar(calendar.id);
            }} className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] transition-all border flex-shrink-0 ${isSelected ? 'bg-background border-border shadow-sm' : 'bg-muted/40 border-transparent opacity-60 hover:opacity-100'}`} title={`${calendar.name} - Click to toggle`}>
                  <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 ${isSelected ? '' : 'opacity-50'}`} style={{
                backgroundColor: calendar.color
              }} />
                  <span className="truncate max-w-[40px] sm:max-w-[60px] text-sm">{calendar.name}</span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-popover z-50 p-2">
                <ContextMenuLabel className="text-xs font-medium px-1 pb-2">
                  Change color for {calendar.name}
                </ContextMenuLabel>
                <ContextMenuSeparator />
                <div className="grid grid-cols-6 gap-1.5 p-1 pt-2">
                  {presetColors.map(color => <button key={color} type="button" onClick={() => updateCalendarColor(calendar.id, color)} className={`w-5 h-5 rounded-md border-2 transition-all hover:scale-110 ${calendar.color === color ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'}`} style={{
                backgroundColor: color
              }} title={color} />)}
                </div>
              </ContextMenuContent>
            </ContextMenu>;
      })}
      </div>

      {/* Toggle all - always visible */}
      <Button type="button" variant="ghost" size="sm" onClick={e => {
      e.preventDefault();
      e.stopPropagation();
      toggleAll();
    }} className="text-[9px] sm:text-[10px] h-5 px-1.5 flex-shrink-0 text-muted-foreground hover:text-foreground">
        {selectedCalendarIds.length === calendars.length ? 'None' : 'All'}
      </Button>
    </div>;
};