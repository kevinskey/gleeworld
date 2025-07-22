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
}

interface CalendarFilterStripProps {
  onCalendarsChange: (selectedCalendarIds: string[]) => void;
}

export const CalendarFilterStrip = ({ onCalendarsChange }: CalendarFilterStripProps) => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [calendarControlsEnabled, setCalendarControlsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadCalendars();
      loadUserPreferences();
    }
  }, [user]);

  useEffect(() => {
    onCalendarsChange(selectedCalendarIds);
  }, [selectedCalendarIds, onCalendarsChange]);

  const loadCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('id, name, color, is_visible')
        .eq('is_visible', true)
        .order('name', { ascending: true });

      if (error) throw error;

      setCalendars(data || []);
      
      // Initially select all visible calendars
      const allCalendarIds = (data || []).map(cal => cal.id);
      setSelectedCalendarIds(allCalendarIds);
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast({
        title: "Error",
        description: "Failed to load calendars",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          setSelectedCalendarIds(data.selected_calendars);
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
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          calendar_controls_enabled: true,
          selected_calendars: []
        });

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
        variant: "destructive",
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

  if (loading) {
    return (
      <Card className="border border-border/50 bg-muted/30">
        <CardContent className="p-3">
          <div className="animate-pulse text-sm text-muted-foreground">
            Loading calendar filters...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calendarControlsEnabled) {
    return (
      <Card className="border border-border/50 bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4" />
            Calendar controls have been disabled by your administrator
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 bg-muted/30">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <span className="text-sm font-medium text-muted-foreground">
                Calendar Filters
              </span>
              
              <span className="text-xs text-muted-foreground">
                ({selectedCalendarIds.length}/{calendars.length} active)
              </span>
            </div>

            {/* Quick toggle preview */}
            {!isExpanded && (
              <div className="flex items-center gap-1">
                {calendars.slice(0, 5).map((calendar) => (
                  <button
                    key={calendar.id}
                    onClick={() => toggleCalendar(calendar.id)}
                    className={`w-4 h-4 rounded-sm border transition-opacity ${
                      selectedCalendarIds.includes(calendar.id) 
                        ? 'opacity-100' 
                        : 'opacity-30'
                    }`}
                    style={{ backgroundColor: calendar.color }}
                    title={`${calendar.name} - Click to ${
                      selectedCalendarIds.includes(calendar.id) ? 'hide' : 'show'
                    }`}
                  />
                ))}
                {calendars.length > 5 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    +{calendars.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          <CollapsibleContent>
            <div className="pt-3">
              <Separator className="mb-3" />
              
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Select Calendars to Display</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                  className="text-xs"
                >
                  {selectedCalendarIds.length === calendars.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {calendars.map((calendar) => {
                  const isSelected = selectedCalendarIds.includes(calendar.id);
                  
                  return (
                    <button
                      key={calendar.id}
                      onClick={() => toggleCalendar(calendar.id)}
                      className={`flex items-center gap-3 p-2 rounded-md border transition-all hover:bg-muted/50 ${
                        isSelected 
                          ? 'bg-background border-border' 
                          : 'bg-muted/30 border-border/30 opacity-60'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-sm border-2 transition-all ${
                          isSelected ? 'scale-100' : 'scale-75 opacity-50'
                        }`}
                        style={{ 
                          backgroundColor: isSelected ? calendar.color : 'transparent',
                          borderColor: calendar.color 
                        }}
                      />
                      <span className={`text-sm ${isSelected ? 'font-medium' : 'font-normal'}`}>
                        {calendar.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {calendars.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No calendars available
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};