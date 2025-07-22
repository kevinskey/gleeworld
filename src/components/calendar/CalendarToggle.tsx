import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_visible: boolean;
  is_default: boolean;
}

interface CalendarToggleProps {
  onCalendarsChange?: (visibleCalendarIds: string[]) => void;
}

export const CalendarToggle = ({ onCalendarsChange }: CalendarToggleProps) => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCalendars();
  }, []);

  useEffect(() => {
    const visibleCalendarIds = calendars
      .filter(cal => cal.is_visible)
      .map(cal => cal.id);
    onCalendarsChange?.(visibleCalendarIds);
  }, [calendars, onCalendarsChange]);

  const fetchCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCalendars(data || []);
    } catch (error) {
      console.error('Error fetching calendars:', error);
      toast.error("Failed to load calendars");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCalendarVisibility = async (calendar: Calendar) => {
    try {
      const newVisibility = !calendar.is_visible;
      
      const { error } = await supabase
        .from('gw_calendars')
        .update({ is_visible: newVisibility })
        .eq('id', calendar.id);

      if (error) throw error;

      setCalendars(prev => 
        prev.map(cal => 
          cal.id === calendar.id 
            ? { ...cal, is_visible: newVisibility }
            : cal
        )
      );

      toast.success(`${calendar.name} ${newVisibility ? 'shown' : 'hidden'}`);
    } catch (error) {
      console.error('Error toggling calendar visibility:', error);
      toast.error("Failed to update calendar visibility");
    }
  };

  const visibleCount = calendars.filter(cal => cal.is_visible).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Calendars ({visibleCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Calendar Visibility</DialogTitle>
          <DialogDescription>
            Choose which calendars to show or hide in the calendar view.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">Loading calendars...</div>
          ) : calendars.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No calendars found
            </div>
          ) : (
            calendars.map((calendar) => (
              <div 
                key={calendar.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium truncate">
                        {calendar.name}
                      </Label>
                      {calendar.is_default && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    {calendar.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {calendar.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {calendar.is_visible ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={calendar.is_visible}
                    onCheckedChange={() => toggleCalendarVisibility(calendar)}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {visibleCount} of {calendars.length} calendars visible
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};