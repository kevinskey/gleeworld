import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
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
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="px-3 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-0.5">
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              </CollapsibleTrigger>
              
              <span className="text-xs font-medium text-primary-foreground">
                Calendar Filters
              </span>
              
              <span className="text-[10px] text-secondary-foreground">
                ({selectedCalendarIds.length}/{calendars.length} active)
              </span>
            </div>

            {/* Quick toggle preview */}
            {!isExpanded && <div className="flex items-center gap-1">
                {calendars.slice(0, 5).map(calendar => <button key={calendar.id} onClick={() => toggleCalendar(calendar.id)} className={`w-3 h-3 rounded-sm border transition-opacity ${selectedCalendarIds.includes(calendar.id) ? 'opacity-100' : 'opacity-30'}`} style={{
              backgroundColor: calendar.color
            }} title={`${calendar.name} - Click to ${selectedCalendarIds.includes(calendar.id) ? 'hide' : 'show'}`} />)}
                {calendars.length > 5 && <span className="text-[10px] text-muted-foreground ml-1">
                    +{calendars.length - 5}
                  </span>}
              </div>}
          </div>

          <CollapsibleContent>
            <div className="pt-2">
              <Separator className="mb-2" />
              
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium">Select Calendars to Display</h4>
                <Button variant="outline" size="sm" onClick={toggleAll} className="text-[10px] h-6 px-2">
                  {selectedCalendarIds.length === calendars.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {calendars.map(calendar => {
                const isSelected = selectedCalendarIds.includes(calendar.id);
                return <button key={calendar.id} onClick={() => toggleCalendar(calendar.id)} className={`flex items-center gap-2 px-2 py-1 rounded border text-xs transition-all hover:bg-muted/50 ${isSelected ? 'bg-background border-border' : 'bg-muted/30 border-border/30 opacity-60'}`}>
                      <div className={`w-3 h-3 rounded-sm border transition-all flex-shrink-0 ${isSelected ? 'scale-100' : 'scale-75 opacity-50'}`} style={{
                    backgroundColor: isSelected ? calendar.color : 'transparent',
                    borderColor: calendar.color
                  }} />
                      <span className={`truncate ${isSelected ? 'font-medium' : 'font-normal'}`}>
                        {calendar.name}
                      </span>
                    </button>;
              })}
              </div>

              {calendars.length === 0 && <div className="text-center py-4 text-sm text-muted-foreground">
                  No calendars available
                </div>}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>;
};