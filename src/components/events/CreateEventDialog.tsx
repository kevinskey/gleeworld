import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Repeat, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMergedProfile } from "@/hooks/useMergedProfile";

interface CreateEventDialogProps {
  onEventCreated?: () => void;
}

export const CreateEventDialog = ({ onEventCreated }: CreateEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile } = useMergedProfile(user);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    event_name: '',
    event_type: 'performance',
    event_date_start: '',
    event_date_end: '',
    location: '',
    is_travel_involved: false,
    expected_headcount: '',
    no_sing_rest_required: false,
    no_sing_rest_date_start: '',
    no_sing_rest_date_end: '',
    brief_description: '',
    approval_needed: false,
    is_recurring: false,
    recurring_frequency: 'weekly',
    recurring_days: ['monday', 'wednesday', 'friday'],
    recurring_end_date: '',
    recurring_end_type: 'date'
  });

  // Check if user is executive board member
  const isExecBoardMember = profile?.exec_board_role && profile.exec_board_role.trim() !== '';
  const isTourManagerOrAdmin = profile?.role === 'super-admin' || 
                               profile?.role === 'admin' || 
                               profile?.exec_board_role?.toLowerCase().includes('tour');

  // Event types that require budget creation (for exec board)
  const budgetRequiredEvents = ['social', 'meeting', 'workshop', 'audition', 'other'];
  
  // Event types that require contracts (handled by tour manager/admin)
  const contractRequiredEvents = ['performance', 'rehearsal'];

  const eventTypes = [
    { 
      value: 'performance', 
      label: 'Performance',
      requiresBudget: false,
      requiresContract: true,
      description: 'Managed by tour manager/admin with contracts'
    },
    { 
      value: 'rehearsal', 
      label: 'Rehearsal',
      requiresBudget: false,
      requiresContract: true,
      description: 'Managed by tour manager/admin with contracts'
    },
    { 
      value: 'sectional', 
      label: 'Sectional',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'member-meeting', 
      label: 'Member Meeting',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'exec-meeting', 
      label: 'Exec Board Meeting',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'voice-lesson', 
      label: 'Voice Lesson',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'tutorial', 
      label: 'Tutorial',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'social', 
      label: 'Social Event',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'meeting', 
      label: 'Meeting',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'workshop', 
      label: 'Workshop',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'audition', 
      label: 'Audition',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    },
    { 
      value: 'other', 
      label: 'Other',
      requiresBudget: true,
      requiresContract: false,
      description: 'Executive board creates budget'
    }
  ];

  const selectedEventType = eventTypes.find(type => type.value === formData.event_type);
  const requiresBudget = selectedEventType?.requiresBudget || false;
  const requiresContract = selectedEventType?.requiresContract || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Permission checks
    if (requiresBudget && !isExecBoardMember) {
      toast({
        title: "Permission Denied",
        description: "Only executive board members can create events that require budgets.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (formData.is_recurring) {
        // Handle recurring events
        const { data, error } = await supabase.rpc('create_recurring_rehearsals', {
          start_date: formData.event_date_start,
          end_date: formData.recurring_end_type === 'date' ? formData.recurring_end_date : formData.event_date_start,
          created_by_id: user.id
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Created ${data} recurring events successfully!`,
        });
      } else {
        // Handle single event
        const eventData = {
          title: formData.event_name,
          event_name: formData.event_name,
          event_type: formData.event_type,
          start_date: formData.event_date_start,
          end_date: formData.event_date_end || null,
          event_date_start: formData.event_date_start,
          event_date_end: formData.event_date_end || null,
          location: formData.location || null,
          is_travel_involved: formData.is_travel_involved,
          expected_headcount: formData.expected_headcount ? parseInt(formData.expected_headcount) : null,
          no_sing_rest_required: formData.no_sing_rest_required,
          no_sing_rest_date_start: formData.no_sing_rest_date_start || null,
          no_sing_rest_date_end: formData.no_sing_rest_date_end || null,
          brief_description: formData.brief_description || null,
          approval_needed: formData.approval_needed,
          created_by: user.id
        };

        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Event created successfully!",
        });
      }

      onEventCreated?.();
      setOpen(false);
      setFormData({
        event_name: '',
        event_type: 'performance',
        event_date_start: '',
        event_date_end: '',
        location: '',
        is_travel_involved: false,
        expected_headcount: '',
        no_sing_rest_required: false,
        no_sing_rest_date_start: '',
        no_sing_rest_date_end: '',
        brief_description: '',
        approval_needed: false,
        is_recurring: false,
        recurring_frequency: 'weekly',
        recurring_days: ['monday', 'wednesday', 'friday'],
        recurring_end_date: '',
        recurring_end_type: 'date'
      });
    } catch (err) {
      console.error('Error creating event:', err);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Create Event</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Plan a new event. Budget creation and contract management will depend on the event type and your role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Event Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event_name">Event Name *</Label>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
                placeholder="e.g., Senior Send-Off Banquet"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Workflow Information */}
                {selectedEventType && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-2">
                      {requiresBudget && (
                        <Badge variant="secondary" className="text-xs">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Budget Required
                        </Badge>
                      )}
                      {requiresContract && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Contract Managed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedEventType.description}
                    </p>
                    
                    {/* Permission Check */}
                    {requiresBudget && !isExecBoardMember && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>Note:</strong> Only executive board members can create events that require budgets.
                      </div>
                    )}
                    
                    {requiresContract && !isTourManagerOrAdmin && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-blue-800 dark:text-blue-200">
                        <strong>Note:</strong> Contracts for this event type will be managed by the tour manager or administrators.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_headcount">Expected Headcount</Label>
                <Input
                  id="expected_headcount"
                  type="number"
                  value={formData.expected_headcount}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_headcount: e.target.value }))}
                  placeholder="Number of attendees"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date_start">Start Date *</Label>
                <Input
                  id="event_date_start"
                  type="date"
                  value={formData.event_date_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date_start: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_date_end">End Date (Optional)</Label>
                <Input
                  id="event_date_end"
                  type="date"
                  value={formData.event_date_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Room #, venue name, or city/state"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief_description">Brief Description</Label>
              <Textarea
                id="brief_description"
                value={formData.brief_description}
                onChange={(e) => setFormData(prev => ({ ...prev, brief_description: e.target.value }))}
                placeholder="One-liner description of the event"
                rows={2}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Travel Involved?</Label>
                <p className="text-sm text-muted-foreground">
                  Will this event require travel arrangements?
                </p>
              </div>
              <Switch
                checked={formData.is_travel_involved}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_travel_involved: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>No-Sing Rest Period Required?</Label>
                <p className="text-sm text-muted-foreground">
                  Does this event require a vocal rest period?
                </p>
              </div>
              <Switch
                checked={formData.no_sing_rest_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, no_sing_rest_required: checked }))}
              />
            </div>

            {formData.no_sing_rest_required && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="no_sing_rest_date_start">Rest Start Date</Label>
                  <Input
                    id="no_sing_rest_date_start"
                    type="date"
                    value={formData.no_sing_rest_date_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_sing_rest_date_start: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_sing_rest_date_end">Rest End Date</Label>
                  <Input
                    id="no_sing_rest_date_end"
                    type="date"
                    value={formData.no_sing_rest_date_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_sing_rest_date_end: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Approval Needed?</Label>
                <p className="text-sm text-muted-foreground">
                  Does this event need advisor/chair approval?
                </p>
              </div>
              <Switch
                checked={formData.approval_needed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, approval_needed: checked }))}
              />
            </div>
          </div>

          {/* Recurring Events Section */}
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Repeat Event
                </Label>
                <p className="text-sm text-muted-foreground">
                  Create recurring events (like rehearsals)
                </p>
              </div>
              <Switch
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
              />
            </div>

            {formData.is_recurring && (
              <div className="space-y-4 ml-6 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <Select
                    value={formData.recurring_frequency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, recurring_frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>End</Label>
                  <Select
                    value={formData.recurring_end_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, recurring_end_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">On Date</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurring_end_type === 'date' && (
                  <div className="space-y-2">
                    <Label htmlFor="recurring_end_date">End Date</Label>
                    <Input
                      id="recurring_end_date"
                      type="date"
                      value={formData.recurring_end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurring_end_date: e.target.value }))}
                    />
                  </div>
                )}

                <div className="text-sm text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/20 rounded border">
                  <p className="font-medium mb-1">Note for Rehearsals:</p>
                  <p>If creating rehearsals, they will automatically be scheduled for Monday, Wednesday, and Friday from 5:00-6:15 PM at the Music Building, regardless of the settings above.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};