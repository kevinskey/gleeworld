import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [calendarControlsEnabled, setCalendarControlsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [colorPickerCalendar, setColorPickerCalendar] = useState<Calendar | null>(null);
  const [newColor, setNewColor] = useState('');
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();

  const presetColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'
  ];
  useEffect(() => {
    loadCalendars();
    if (user) {
      loadUserPreferences();
    } else {
      // For non-authenticated users, set loading to false after calendars are loaded
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

      // Select all calendars by default to show all events
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

        // If the user has saved a custom selection, respect it,
        // but automatically include any "system" calendars (created_by is null)
        // so global calendars like Spelman don't disappear for existing users.
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

          // Persist the merge once so the user can still toggle calendars later.
          await saveSelectedCalendars(merged);
        }
      } else {
        // Create default preferences for new user
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
      const { error } = await supabase
        .from('gw_calendars')
        .update({ color })
        .eq('id', calendarId);

      if (error) throw error;

      // Update local state
      setCalendars(prev => prev.map(cal => 
        cal.id === calendarId ? { ...cal, color } : cal
      ));

      setColorPickerCalendar(null);
      setNewColor('');

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
    return <Card className="border border-border/50 bg-muted/30">
        <CardContent className="p-3">
          <div className="animate-pulse text-sm text-muted-foreground">
            Loading calendar filters...
          </div>
        </CardContent>
      </Card>;
  }
  if (!calendarControlsEnabled) {
    return <Card className="border border-border/50 bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4" />
            Calendar controls have been disabled by your administrator
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-sm">
      <CardContent className="px-2 sm:px-3 py-1.5">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {/* Label */}
          <span className="text-[10px] sm:text-xs font-medium text-primary-foreground flex-shrink-0">
            Calendars:
          </span>
          
          {/* All calendar swatches - centered */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
            {calendars.map(calendar => {
              const isSelected = selectedCalendarIds.includes(calendar.id);
              return (
                <Popover 
                  key={calendar.id} 
                  open={colorPickerCalendar?.id === calendar.id} 
                  onOpenChange={(open) => {
                    if (open) {
                      setColorPickerCalendar(calendar);
                      setNewColor(calendar.color);
                    } else {
                      setColorPickerCalendar(null);
                      setNewColor('');
                    }
                  }}
                >
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCalendar(calendar.id);
                        }} 
                        className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] sm:text-[10px] transition-all border cursor-pointer ${
                          isSelected 
                            ? 'bg-background border-border opacity-100 text-foreground' 
                            : 'bg-muted/30 border-transparent opacity-70 hover:opacity-100 text-white'
                        }`}
                        title={`${calendar.name} - Click to toggle, right-click to change color`}
                      >
                        <div 
                          className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-transform ${isSelected ? 'scale-100' : 'scale-75'}`} 
                          style={{ backgroundColor: calendar.color }}
                        />
                        <span className="truncate max-w-[45px] sm:max-w-[55px]">{calendar.name}</span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-popover z-50">
                      <PopoverTrigger asChild>
                        <ContextMenuItem className="gap-2 cursor-pointer">
                          <Palette className="h-4 w-4" />
                          Change Color
                        </ContextMenuItem>
                      </PopoverTrigger>
                    </ContextMenuContent>
                  </ContextMenu>
                  <PopoverContent className="w-auto p-3 bg-popover z-50" align="start">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Choose color for {calendar.name}</Label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {presetColors.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateCalendarColor(calendar.id, color)}
                            className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                              calendar.color === color ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={newColor || calendar.color}
                          onChange={(e) => setNewColor(e.target.value)}
                          className="w-10 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={newColor || calendar.color}
                          onChange={(e) => setNewColor(e.target.value)}
                          placeholder="#000000"
                          className="flex-1 h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => updateCalendarColor(calendar.id, newColor || calendar.color)}
                          className="h-8 text-xs"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>

          {/* Toggle all button */}
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleAll();
            }} 
            className="text-[9px] sm:text-[10px] h-5 px-1.5 flex-shrink-0"
          >
            {selectedCalendarIds.length === calendars.length ? 'Hide' : 'All'}
          </Button>
        </div>

        {calendars.length === 0 && (
          <div className="text-center py-2 text-[10px] text-muted-foreground">
            No calendars available
          </div>
        )}
      </CardContent>
    </Card>;
};