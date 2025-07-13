import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar,
  Save,
  RefreshCw
} from 'lucide-react';

interface GleeEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date?: string;
}

interface AttendanceMember {
  user_id: string;
  full_name: string;
  voice_part?: string;
  avatar_url?: string;
  attendance_status?: string;
  notes?: string;
  has_pre_excuse?: boolean;
}

export const TakeAttendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<GleeEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [members, setMembers] = useState<AttendanceMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: string; notes: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load upcoming events
  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  // Load members when event is selected
  useEffect(() => {
    if (selectedEvent) {
      loadEventMembers();
    }
  }, [selectedEvent]);

  const loadUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, event_type, start_date, end_date')
        .gte('start_date', new Date().toISOString())
        .order('start_date')
        .limit(10);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    }
  };

  const loadEventMembers = async () => {
    if (!selectedEvent) return;
    
    setLoading(true);
    try {
      // Load all glee club members
      const { data: profilesData, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, voice_part, avatar_url')
        .not('full_name', 'is', null)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Load existing attendance for this event
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('gw_event_attendance')
        .select('user_id, attendance_status, notes')
        .eq('event_id', selectedEvent);

      if (attendanceError) throw attendanceError;

      // Load approved pre-event excuses for this event
      const { data: preExcuseData, error: preExcuseError } = await supabase
        .from('gw_pre_event_excuses')
        .select('user_id, reason, status')
        .eq('event_id', selectedEvent)
        .eq('status', 'approved');

      if (preExcuseError) throw preExcuseError;

      // Create maps for existing data
      const attendanceMap = new Map(
        attendanceData?.map(a => [a.user_id, { status: a.attendance_status, notes: a.notes || '' }]) || []
      );

      const preExcuseMap = new Map(
        preExcuseData?.map(e => [e.user_id, e.reason]) || []
      );

      // Merge attendance data with profiles
      const membersWithAttendance = profilesData?.map(member => {
        const existingAttendance = attendanceMap.get(member.user_id);
        const preExcuse = preExcuseMap.get(member.user_id);
        
        // If there's an approved pre-event excuse and no existing attendance, set as excused
        let status = existingAttendance?.status;
        let notes = existingAttendance?.notes || '';
        
        if (preExcuse && !existingAttendance) {
          status = 'excused';
          notes = `Pre-event excuse: ${preExcuse}`;
        }

        return {
          ...member,
          attendance_status: status,
          notes,
          has_pre_excuse: !!preExcuse
        };
      }) || [];

      setMembers(membersWithAttendance);

      // Initialize attendance state
      const initialAttendance: Record<string, { status: string; notes: string }> = {};
      membersWithAttendance.forEach(member => {
        initialAttendance[member.user_id] = {
          status: member.attendance_status || 'present',
          notes: member.notes || ''
        };
      });
      setAttendance(initialAttendance);

    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = (userId: string, field: 'status' | 'notes', value: string) => {
    setAttendance(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const saveAttendance = async () => {
    if (!selectedEvent || !user) return;

    setSaving(true);
    try {
      const attendanceRecords = Object.entries(attendance).map(([userId, data]) => ({
        event_id: selectedEvent,
        user_id: userId,
        attendance_status: data.status,
        notes: data.notes || null,
        recorded_by: user.id,
        check_in_time: data.status === 'present' ? new Date().toISOString() : null
      }));

      const { error } = await supabase
        .from('gw_event_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'event_id,user_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Attendance saved for ${attendanceRecords.length} members`,
      });

      // Reload to show updated data
      loadEventMembers();

    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Error",
        description: "Failed to save attendance",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'left_early':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'excused':
        return 'bg-yellow-100 text-yellow-800';
      case 'late':
      case 'left_early':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceStats = () => {
    const total = Object.keys(attendance).length;
    const present = Object.values(attendance).filter(a => a.status === 'present').length;
    const absent = Object.values(attendance).filter(a => a.status === 'absent').length;
    const excused = Object.values(attendance).filter(a => a.status === 'excused').length;
    const late = Object.values(attendance).filter(a => a.status === 'late').length;
    
    return { total, present, absent, excused, late };
  };

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an event to take attendance" />
            </SelectTrigger>
            <SelectContent>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{event.title}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="outline" className="text-xs">
                        {event.event_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.start_date), 'MMM dd, h:mm a')}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEvent && (
        <>
          {/* Attendance Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Total Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.excused}</div>
                    <p className="text-xs text-muted-foreground">Excused</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{stats.late}</div>
                    <p className="text-xs text-muted-foreground">Late</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Member Attendance
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={loadEventMembers}
                  disabled={loading}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  onClick={saveAttendance}
                  disabled={saving || loading}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map(member => (
                    <div key={member.user_id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Avatar>
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>
                          {member.full_name?.charAt(0) || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      
                       <div className="flex-1">
                         <div className="flex items-center gap-2">
                           <div className="font-medium">{member.full_name}</div>
                           {member.has_pre_excuse && (
                             <Badge className="bg-blue-100 text-blue-800 text-xs">
                               Pre-Excuse
                             </Badge>
                           )}
                         </div>
                         {member.voice_part && (
                           <Badge variant="outline" className="text-xs mt-1">
                             {member.voice_part}
                           </Badge>
                         )}
                       </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(attendance[member.user_id]?.status || 'present')}
                          <Select
                            value={attendance[member.user_id]?.status || 'present'}
                            onValueChange={(value) => updateAttendance(member.user_id, 'status', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="excused">Excused</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="left_early">Left Early</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Textarea
                          placeholder="Notes (optional)"
                          value={attendance[member.user_id]?.notes || ''}
                          onChange={(e) => updateAttendance(member.user_id, 'notes', e.target.value)}
                          className="w-48 min-h-[36px] max-h-24"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};