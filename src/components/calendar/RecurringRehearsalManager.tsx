import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Music, Repeat, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RecurringRehearsalManagerProps {
  onRehearsalsCreated: () => void;
}

export const RecurringRehearsalManager = ({ onRehearsalsCreated }: RecurringRehearsalManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  // Default to August 20 - December 3 for the semester
  const [startDate, setStartDate] = useState<Date>(new Date(2025, 7, 20)); // August 20, 2025
  const [endDate, setEndDate] = useState<Date>(new Date(2025, 11, 3)); // December 3, 2025
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const handleCreateRehearsals = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_recurring_rehearsals', {
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        created_by_id: user?.id
      });

      if (error) throw error;

      toast({
        title: "Rehearsals Created",
        description: `Successfully created ${data} rehearsal events`,
      });

      setOpen(false);
      // Reset to default semester dates
      setStartDate(new Date(2025, 7, 20)); // August 20, 2025
      setEndDate(new Date(2025, 11, 3)); // December 3, 2025
      onRehearsalsCreated();
    } catch (error) {
      console.error('Error creating rehearsals:', error);
      toast({
        title: "Error",
        description: "Failed to create rehearsal events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOldRehearsals = async () => {
    setCleanupLoading(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_old_rehearsals');

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: `Removed ${data} old rehearsal events`,
      });

      onRehearsalsCreated();
    } catch (error) {
      console.error('Error cleaning up rehearsals:', error);
      toast({
        title: "Error",
        description: "Failed to cleanup old rehearsals",
        variant: "destructive",
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  const getPreviewText = () => {
    if (!startDate || !endDate) return "Select dates to see preview";
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const approxRehearsals = Math.floor(daysDiff / 7) * 3; // Approximately 3 per week
    
    return `This will create approximately ${approxRehearsals} rehearsal events from ${format(startDate, 'MMM dd, yyyy')} to ${format(endDate, 'MMM dd, yyyy')}`;
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Recurring Rehearsals
          </CardTitle>
          <CardDescription>
            Manage Spelman College Glee Club rehearsal schedule (Monday, Wednesday, Friday 5:00-6:15 PM)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Rehearsals
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Repeat className="h-5 w-5" />
                    Create Recurring Rehearsals
                  </DialogTitle>
                  <DialogDescription>
                    Create Spelman College Glee Club rehearsals for Monday, Wednesday, and Friday from 5:00 PM to 6:15 PM.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "MMM dd, yyyy") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                              setStartDate(date);
                              setShowStartCalendar(false);
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "MMM dd, yyyy") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => {
                              setEndDate(date);
                              setShowEndCalendar(false);
                            }}
                            disabled={(date) => date < (startDate || new Date())}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Rehearsal Settings */}
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium text-sm text-foreground">Rehearsal Settings</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Days</Label>
                        <p className="text-foreground">Monday, Wednesday, Friday</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <p className="text-foreground">5:00 PM - 6:15 PM</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Location</Label>
                        <p className="text-foreground">Spelman Music Building</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Visibility</Label>
                        <p className="text-foreground">Public Event</p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="p-4 bg-muted rounded-lg border">
                    <div className="flex items-start gap-2">
                      <Music className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {getPreviewText()}
                        </p>
                        {startDate && endDate && (
                          <p className="text-xs text-muted-foreground">
                            Events will be created on {format(startDate, 'EEEE, MMM dd')} through {format(endDate, 'EEEE, MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleCreateRehearsals} 
                      disabled={loading || !startDate || !endDate}
                      className="flex-1"
                    >
                      {loading ? "Creating Rehearsals..." : "Create All Rehearsals"}
                    </Button>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={handleCleanupOldRehearsals}
              disabled={cleanupLoading}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {cleanupLoading ? "Cleaning..." : "Cleanup Old"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>• Rehearsals are created for Monday, Wednesday, and Friday</p>
            <p>• Time: 5:00 PM - 6:15 PM (EST)</p>
            <p>• Location: Spelman College Music Building</p>
            <p>• All events are public and visible to everyone</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};