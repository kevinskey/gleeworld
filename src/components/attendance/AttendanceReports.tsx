import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Shield
} from 'lucide-react';

interface AttendanceReport {
  voice_part: string;
  total_events: number;
  avg_attendance: number;
  member_count: number;
}

interface MemberReport {
  user_id: string;
  full_name: string;
  voice_part: string;
  attendance_percentage: number;
  total_events: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
}

interface EventReport {
  event_id: string;
  title: string;
  event_type: string;
  start_date: string;
  attendance_rate: number;
  total_members: number;
  present_count: number;
}

export const AttendanceReports = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [sectionReports, setSectionReports] = useState<AttendanceReport[]>([]);
  const [memberReports, setMemberReports] = useState<MemberReport[]>([]);
  const [eventReports, setEventReports] = useState<EventReport[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalEvents: 0,
    averageAttendance: 0,
    totalMembers: 0,
    perfectAttendees: 0
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  const isSectionLeader = false; // TODO: Add is_section_leader to profile

  useEffect(() => {
    if (user && (isAdmin || isSectionLeader)) {
      loadReports();
    }
  }, [user, selectedPeriod, isAdmin, isSectionLeader]);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'current':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'semester':
        const currentMonth = now.getMonth();
        const semesterStart = currentMonth >= 7 
          ? new Date(now.getFullYear(), 7, 1)
          : new Date(now.getFullYear(), 0, 1);
        return {
          start: semesterStart,
          end: now
        };
      case 'all':
        return {
          start: new Date(2020, 0, 1),
          end: now
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      // Get events in the date range
      const { data: events, error: eventsError } = await supabase
        .from('gw_events')
        .select('id, title, event_type, start_date')
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .order('start_date');

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        setOverallStats({ totalEvents: 0, averageAttendance: 0, totalMembers: 0, perfectAttendees: 0 });
        setSectionReports([]);
        setMemberReports([]);
        setEventReports([]);
        setLoading(false);
        return;
      }

      const eventIds = events.map(e => e.id);

      // Get attendance records for these events
      const { data: attendance, error: attendanceError } = await supabase
        .from('gw_event_attendance')
        .select(`
          event_id,
          user_id,
          attendance_status,
          gw_profiles!gw_event_attendance_user_id_fkey(
            full_name,
            voice_part
          )
        `)
        .in('event_id', eventIds);

      if (attendanceError) throw attendanceError;

      // Calculate section reports
      const sectionStats = new Map<string, { total: number; present: number; members: Set<string> }>();
      
      attendance?.forEach(record => {
        const voicePart = record.gw_profiles?.voice_part || 'Unknown';
        if (!sectionStats.has(voicePart)) {
          sectionStats.set(voicePart, { total: 0, present: 0, members: new Set() });
        }
        const stats = sectionStats.get(voicePart)!;
        stats.total++;
        stats.members.add(record.user_id);
        if (record.attendance_status === 'present' || record.attendance_status === 'late') {
          stats.present++;
        }
      });

      const sectionReportsData: AttendanceReport[] = Array.from(sectionStats.entries()).map(([voicePart, stats]) => ({
        voice_part: voicePart,
        total_events: events.length,
        avg_attendance: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        member_count: stats.members.size
      }));

      setSectionReports(sectionReportsData);

      // Calculate member reports
      const memberStats = new Map<string, { 
        name: string; 
        voicePart: string; 
        total: number; 
        present: number; 
        absent: number; 
        excused: number; 
      }>();

      attendance?.forEach(record => {
        const userId = record.user_id;
        if (!memberStats.has(userId)) {
          memberStats.set(userId, {
            name: record.gw_profiles?.full_name || 'Unknown',
            voicePart: record.gw_profiles?.voice_part || 'Unknown',
            total: 0,
            present: 0,
            absent: 0,
            excused: 0
          });
        }
        const stats = memberStats.get(userId)!;
        stats.total++;
        
        switch (record.attendance_status) {
          case 'present':
          case 'late':
            stats.present++;
            break;
          case 'absent':
            stats.absent++;
            break;
          case 'excused':
            stats.excused++;
            break;
        }
      });

      const memberReportsData: MemberReport[] = Array.from(memberStats.entries())
        .map(([userId, stats]) => ({
          user_id: userId,
          full_name: stats.name,
          voice_part: stats.voicePart,
          attendance_percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
          total_events: stats.total,
          present_count: stats.present,
          absent_count: stats.absent,
          excused_count: stats.excused
        }))
        .sort((a, b) => b.attendance_percentage - a.attendance_percentage);

      setMemberReports(memberReportsData);

      // Calculate event reports
      const eventStats = new Map<string, { present: number; total: number }>();
      
      attendance?.forEach(record => {
        const eventId = record.event_id;
        if (!eventStats.has(eventId)) {
          eventStats.set(eventId, { present: 0, total: 0 });
        }
        const stats = eventStats.get(eventId)!;
        stats.total++;
        if (record.attendance_status === 'present' || record.attendance_status === 'late') {
          stats.present++;
        }
      });

      const eventReportsData: EventReport[] = events.map(event => {
        const stats = eventStats.get(event.id) || { present: 0, total: 0 };
        return {
          event_id: event.id,
          title: event.title,
          event_type: event.event_type,
          start_date: event.start_date,
          attendance_rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
          total_members: stats.total,
          present_count: stats.present
        };
      }).sort((a, b) => b.attendance_rate - a.attendance_rate);

      setEventReports(eventReportsData);

      // Calculate overall stats
      const totalAttendanceRecords = attendance?.length || 0;
      const totalPresentRecords = attendance?.filter(r => 
        r.attendance_status === 'present' || r.attendance_status === 'late'
      ).length || 0;
      
      const overallAttendanceRate = totalAttendanceRecords > 0 
        ? Math.round((totalPresentRecords / totalAttendanceRecords) * 100) 
        : 0;

      const perfectAttendees = memberReportsData.filter(m => m.attendance_percentage === 100).length;

      setOverallStats({
        totalEvents: events.length,
        averageAttendance: overallAttendanceRate,
        totalMembers: memberStats.size,
        perfectAttendees
      });

    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || (!isAdmin && !isSectionLeader)) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-gray-600">Only administrators and section leaders can view reports.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attendance Reports
            </CardTitle>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">This Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="semester">This Semester</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{overallStats.totalEvents}</div>
                    <p className="text-xs text-muted-foreground">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">{overallStats.averageAttendance}%</div>
                    <p className="text-xs text-muted-foreground">Average Attendance</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">{overallStats.totalMembers}</div>
                    <p className="text-xs text-muted-foreground">Active Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{overallStats.perfectAttendees}</div>
                    <p className="text-xs text-muted-foreground">Perfect Attendance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance by Voice Part</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectionReports.map(section => (
                  <div key={section.voice_part} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{section.voice_part}</span>
                        <Badge variant="outline" className="text-xs">
                          {section.member_count} members
                        </Badge>
                      </div>
                      <span className="text-lg font-bold">{section.avg_attendance}%</span>
                    </div>
                    <Progress value={section.avg_attendance} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Member Attendance Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memberReports.slice(0, 10).map((member, index) => (
                  <div key={member.user_id} className="flex items-center gap-4">
                    <div className="w-8 text-center">
                      {index < 3 ? (
                        <Award className={`h-5 w-5 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} />
                      ) : (
                        <span className="text-muted-foreground">#{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{member.full_name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {member.voice_part}
                        </Badge>
                        <span>{member.present_count}/{member.total_events} events</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        member.attendance_percentage >= 90 ? 'text-green-600' :
                        member.attendance_percentage >= 75 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {member.attendance_percentage}%
                      </div>
                      {member.attendance_percentage === 100 && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Perfect
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Event Attendance Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventReports.map(event => (
                  <div key={event.event_id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Badge variant="outline" className="text-xs">
                          {event.event_type}
                        </Badge>
                        <span>{format(new Date(event.start_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Attendance</div>
                      <div className="font-medium">
                        {event.present_count}/{event.total_members}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        event.attendance_rate >= 90 ? 'text-green-600' :
                        event.attendance_rate >= 75 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {event.attendance_rate}%
                      </div>
                      {event.attendance_rate < 75 && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          Low
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};