import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  BarChart3,
  User,
  Download,
  Eye,
  FileText
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  attendance_status: string;
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  created_at: string;
  gw_events: {
    title: string;
    event_type: string;
    start_date: string;
    location?: string;
  };
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
  percentage: number;
}

interface ExcuseRequest {
  id: string;
  event_title: string;
  event_date: string;
  reason: string;
  status: string;
  submitted_at: string;
}

export const FullAttendanceRecord = () => {
  console.log('🔍 FullAttendanceRecord: Component rendering');
  const { user } = useAuth();
  console.log('🔍 FullAttendanceRecord: User:', user);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    excused: 0,
    late: 0,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedView, setSelectedView] = useState('summary');

  useEffect(() => {
    if (user) {
      loadAttendanceData();
      loadExcuseRequests();
    }
  }, [user, selectedPeriod]);

  const loadAttendanceData = async () => {
    if (!user) return;

    try {
      console.log('🔍 FullAttendanceRecord: Starting data load for user:', user?.id);
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      const now = new Date();

      switch (selectedPeriod) {
        case 'current-month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'last-month':
          const lastMonth = subMonths(now, 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          break;
        case 'current-year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        case 'all-time':
        default:
          startDate = new Date('2020-01-01');
          endDate = now;
          break;
      }

      console.log('🔍 FullAttendanceRecord: Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          gw_events:event_id(title, start_date, event_type, location)
        `)
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: false });

      console.log('🔍 FullAttendanceRecord: Query result:', { data, error });

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = (data || []).map(record => ({
        id: record.id,
        attendance_status: record.status,
        check_in_time: undefined, // Not available in current schema
        check_out_time: undefined, // Not available in current schema
        notes: record.notes,
        created_at: record.recorded_at,
        gw_events: {
          title: record.gw_events?.title || 'Unknown Event',
          event_type: record.gw_events?.event_type || 'unknown',
          start_date: record.gw_events?.start_date || record.recorded_at,
          location: record.gw_events?.location
        }
      }));

      console.log('🔍 FullAttendanceRecord: Transformed data:', transformedData);
      setRecords(transformedData);
      calculateStats(transformedData);
    } catch (error) {
      console.error('❌ FullAttendanceRecord: Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExcuseRequests = async () => {
    if (!user) return;

    try {
      // For now, show placeholder data since excuse requests table may not exist yet
      setExcuseRequests([]);
    } catch (error) {
      console.error('Error loading excuse requests:', error);
    }
  };

  const calculateStats = (data: AttendanceRecord[]) => {
    const total = data.length;
    const present = data.filter(r => r.attendance_status === 'present').length;
    const absent = data.filter(r => r.attendance_status === 'absent').length;
    const excused = data.filter(r => r.attendance_status === 'excused').length;
    const late = data.filter(r => r.attendance_status === 'late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    setStats({
      total,
      present,
      absent,
      excused,
      late,
      percentage
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
      case 'excused':
        return <Badge className="bg-blue-100 text-blue-800"><AlertTriangle className="w-3 h-3 mr-1" />Excused</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Late</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExcuseStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'denied':
        return <Badge className="bg-red-100 text-red-800">Denied</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Event', 'Type', 'Status', 'Check In', 'Check Out', 'Notes'],
      ...records.map(record => [
        format(new Date(record.gw_events.start_date), 'yyyy-MM-dd'),
        record.gw_events.title,
        record.gw_events.event_type,
        record.attendance_status,
        record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '',
        record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '',
        record.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-record-${selectedPeriod}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Full Attendance Record</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Excused</p>
                <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{stats.percentage}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={stats.percentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed View */}
      <Tabs value={selectedView} onValueChange={setSelectedView}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Records</TabsTrigger>
          <TabsTrigger value="excuses">Excuse Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                    <div className="text-sm text-muted-foreground">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                    <div className="text-sm text-muted-foreground">Absent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
                    <div className="text-sm text-muted-foreground">Excused</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                    <div className="text-sm text-muted-foreground">Late</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold">{stats.percentage}%</div>
                  <div className="text-muted-foreground">Overall Attendance Rate</div>
                  <Progress value={stats.percentage} className="mt-2 max-w-md mx-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {records.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No attendance records found for the selected period.</p>
                ) : (
                  records.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{record.gw_events.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(record.gw_events.start_date), 'PPP')} • {record.gw_events.event_type}
                        </div>
                        {record.gw_events.location && (
                          <div className="text-xs text-muted-foreground">{record.gw_events.location}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {record.check_in_time && (
                          <div className="text-xs text-muted-foreground">
                            In: {format(new Date(record.check_in_time), 'HH:mm')}
                          </div>
                        )}
                        {record.check_out_time && (
                          <div className="text-xs text-muted-foreground">
                            Out: {format(new Date(record.check_out_time), 'HH:mm')}
                          </div>
                        )}
                        {getStatusBadge(record.attendance_status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excuses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Excuse Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {excuseRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No excuse requests found.</p>
                ) : (
                  excuseRequests.map((excuse) => (
                    <div key={excuse.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{excuse.event_title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(excuse.event_date), 'PPP')}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Submitted: {format(new Date(excuse.submitted_at), 'PPP')}
                        </div>
                        <div className="text-sm mt-1">{excuse.reason}</div>
                      </div>
                      <div>
                        {getExcuseStatusBadge(excuse.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};