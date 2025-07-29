import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserCheck, Calendar as CalendarIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ExecutiveBoardMember {
  id: string;
  user_id: string;
  position: string;
  user_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface CallMeetingDialogProps {
  onMeetingCreated: () => void;
}

export const CallMeetingDialog = ({ onMeetingCreated }: CallMeetingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [execMembers, setExecMembers] = useState<ExecutiveBoardMember[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: '',
    duration: '60',
    agenda: ''
  });

  // Load executive board members
  const loadExecMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_executive_board_members')
        .select(`
          id,
          user_id,
          position,
          gw_profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;

      const membersWithProfiles = data?.map(member => ({
        ...member,
        user_profile: Array.isArray(member.gw_profiles) 
          ? member.gw_profiles[0] 
          : member.gw_profiles
      })) || [];

      setExecMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading executive board members:', error);
      toast({
        title: "Error",
        description: "Failed to load executive board members",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadExecMembers();
      setFormData({
        title: 'Executive Board Meeting',
        description: '',
        time: '',
        duration: '60',
        agenda: ''
      });
    }
  }, [open]);

  const getPositionLabel = (position: string) => {
    const positionLabels: Record<string, string> = {
      'president': 'President',
      'secretary': 'Secretary',
      'treasurer': 'Treasurer',
      'tour_manager': 'Tour Manager',
      'wardrobe_manager': 'Wardrobe Manager',
      'librarian': 'Librarian',
      'historian': 'Historian',
      'pr_coordinator': 'PR Coordinator',
      'chaplain': 'Chaplain',
      'data_analyst': 'Data Analyst',
      'assistant_chaplain': 'Assistant Chaplain',
      'student_conductor': 'Student Conductor',
      'section_leader_s1': 'Section Leader (S1)',
      'section_leader_s2': 'Section Leader (S2)',
      'section_leader_a1': 'Section Leader (A1)',
      'section_leader_a2': 'Section Leader (A2)'
    };
    return positionLabels[position] || position;
  };

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      'president': 'bg-purple-100 text-purple-800',
      'secretary': 'bg-blue-100 text-blue-800',
      'treasurer': 'bg-green-100 text-green-800',
      'tour_manager': 'bg-orange-100 text-orange-800',
      'student_conductor': 'bg-red-100 text-red-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate || !formData.time) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create the meeting event
      const meetingDateTime = new Date(selectedDate);
      const [hours, minutes] = formData.time.split(':').map(Number);
      meetingDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(meetingDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(formData.duration));

      // Get the default calendar or executive board calendar
      const { data: calendars } = await supabase
        .from('gw_calendars')
        .select('id')
        .or('name.ilike.%executive%,is_default.eq.true')
        .eq('is_visible', true)
        .limit(1);

      const calendarId = calendars?.[0]?.id;
      if (!calendarId) {
        throw new Error('No suitable calendar found for the meeting');
      }

      const eventData = {
        title: formData.title,
        description: formData.description + (formData.agenda ? `\n\nAgenda:\n${formData.agenda}` : ''),
        event_type: 'exec-meeting',
        start_date: meetingDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        is_public: false,
        attendance_required: true,
        created_by: user.id,
        status: 'scheduled',
        calendar_id: calendarId
      };

      const { data: newEvent, error: eventError } = await supabase
        .from('gw_events')
        .insert(eventData)
        .select()
        .single();

      if (eventError) throw eventError;

      // Create team members for all executive board members
      if (execMembers.length > 0) {
        const teamMemberData = execMembers.map(member => ({
          event_id: newEvent.id,
          user_id: member.user_id,
          role: getPositionLabel(member.position)
        }));

        const { error: teamError } = await supabase
          .from('event_team_members')
          .insert(teamMemberData);

        if (teamError) {
          console.error('Error adding team members:', teamError);
        }
      }

      // Send notifications to executive board members
      try {
        await supabase.functions.invoke('send-event-notifications', {
          body: {
            eventId: newEvent.id,
            eventTitle: formData.title,
            eventDate: meetingDateTime.toISOString(),
            userIds: execMembers.map(m => m.user_id),
            message: `Executive Board Meeting called for ${format(meetingDateTime, 'PPP')} at ${formData.time}`
          }
        });
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the meeting creation if notifications fail
      }

      toast({
        title: "Success",
        description: `Executive Board Meeting scheduled for ${format(meetingDateTime, 'PPP')} at ${formData.time}`,
      });

      setOpen(false);
      onMeetingCreated();
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to schedule meeting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/10">
          <Users className="h-4 w-4" />
          Call a Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Call Executive Board Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Executive Board Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Executive Board Members ({execMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {execMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.user_profile?.avatar_url} />
                    <AvatarFallback>
                      {member.user_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {member.user_profile?.full_name || member.user_profile?.email || 'Unknown'}
                    </p>
                    <Badge variant="secondary" className={`text-xs ${getPositionColor(member.position)}`}>
                      {getPositionLabel(member.position)}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Right Column - Meeting Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Meeting Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Executive Board Meeting"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the meeting purpose..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border w-full mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      min="15"
                      max="180"
                      step="15"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="agenda">Agenda (Optional)</Label>
                  <Textarea
                    id="agenda"
                    value={formData.agenda}
                    onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
                    placeholder="Meeting agenda items..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Scheduling...' : 'Schedule Meeting'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};