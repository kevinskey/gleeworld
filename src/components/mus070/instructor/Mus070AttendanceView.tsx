import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { UserCheck, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceRecord {
  id: string;
  student_name: string;
  student_id: string | null;
  excused_rehearsal_absences: number;
  unexcused_rehearsal_absences: number;
  tardies: number;
  excused_performance_absences: number;
  unexcused_performance_absences: number;
  is_dropped: boolean;
}

const MUS070_COURSE_ID = 'a0000000-0000-0000-0000-000000000070';

// Calculate effective absences per handbook rules
const calculateEffectiveAbsences = (data: AttendanceRecord) => {
  // Missing a performance (UA) = 2 absences
  const performanceAsAbsences = data.unexcused_performance_absences * 2;
  // Every 2 tardies beyond 3 = 1 absence
  const excessTardies = Math.max(0, data.tardies - 3);
  const tardiesAsAbsences = Math.floor(excessTardies / 2);
  
  return data.unexcused_rehearsal_absences + performanceAsAbsences + tardiesAsAbsences;
};

const getStatus = (data: AttendanceRecord) => {
  if (data.is_dropped) return 'DROPPED';
  const effectiveAbsences = calculateEffectiveAbsences(data);
  if (effectiveAbsences >= 6) return 'At Risk';
  if (effectiveAbsences > 3) return 'Warning';
  return 'Good';
};

export const Mus070AttendanceView: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAttendance, setUserAttendance] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.is_admin || data?.is_super_admin || false);
    };
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gw_course_attendance_summary')
          .select('*')
          .eq('course_id', MUS070_COURSE_ID)
          .eq('semester', 'FALL 2025')
          .order('student_name');

        if (error) throw error;

        const records: AttendanceRecord[] = (data || []).map(d => ({
          id: d.id,
          student_name: d.student_name,
          student_id: d.student_id,
          excused_rehearsal_absences: d.excused_rehearsal_absences || 0,
          unexcused_rehearsal_absences: d.unexcused_rehearsal_absences || 0,
          tardies: d.tardies || 0,
          excused_performance_absences: d.excused_performance_absences || 0,
          unexcused_performance_absences: d.unexcused_performance_absences || 0,
          is_dropped: d.is_dropped || false,
        }));

        setAttendanceData(records);

        // Find current user's attendance
        if (user) {
          const userName = user.user_metadata?.full_name || '';
          const userRecord = records.find(
            r => r.student_id === user.id || 
                 r.student_name.toLowerCase() === userName.toLowerCase()
          );
          setUserAttendance(userRecord || null);
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading attendance data...</p>
        </CardContent>
      </Card>
    );
  }

  // Admin view - show all members
  if (isAdmin) {
    const filteredMembers = attendanceData
      .map(data => ({
        ...data,
        effectiveAbsences: calculateEffectiveAbsences(data),
        status: getStatus(data)
      }))
      .filter(m => m.student_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const droppedCount = filteredMembers.filter(m => m.status === 'DROPPED').length;
    const warningCount = filteredMembers.filter(m => m.status === 'Warning' || m.status === 'At Risk').length;

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{attendanceData.length}</div>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500">{attendanceData.length - droppedCount - warningCount}</div>
              <p className="text-sm text-muted-foreground">Good Standing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">{warningCount}</div>
              <p className="text-sm text-muted-foreground">Warning/At Risk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-500">{droppedCount}</div>
              <p className="text-sm text-muted-foreground">Dropped</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Full Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserCheck className="h-5 w-5 text-primary" />
              All Members Attendance ({filteredMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground font-semibold">Name</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">EA Rehears.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">UA Rehears.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Tardies</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">EA Perf.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">UA Perf.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Eff. Absences</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className={member.status === 'DROPPED' ? 'bg-red-500/20' : ''}>
                      <TableCell className="font-medium text-foreground">{member.student_name}</TableCell>
                      <TableCell className="text-center text-foreground">{member.excused_rehearsal_absences}</TableCell>
                      <TableCell className="text-center text-foreground">
                        <span className={member.unexcused_rehearsal_absences >= 6 ? 'text-red-400 font-bold' : member.unexcused_rehearsal_absences > 3 ? 'text-yellow-400' : ''}>
                          {member.unexcused_rehearsal_absences}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-foreground">
                        <span className={member.tardies >= 10 ? 'text-red-400 font-bold' : member.tardies > 5 ? 'text-yellow-400' : ''}>
                          {member.tardies}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-foreground">{member.excused_performance_absences}</TableCell>
                      <TableCell className="text-center text-foreground">
                        <span className={member.unexcused_performance_absences > 0 ? 'text-red-400 font-bold' : ''}>
                          {member.unexcused_performance_absences}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={member.effectiveAbsences >= 6 ? 'text-red-400 font-bold' : member.effectiveAbsences > 3 ? 'text-yellow-400' : 'text-foreground'}>
                          {member.effectiveAbsences}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {member.status === 'DROPPED' ? (
                          <Badge variant="destructive">DROPPED</Badge>
                        ) : member.status === 'At Risk' ? (
                          <Badge className="bg-red-500/80 text-white">At Risk</Badge>
                        ) : member.status === 'Warning' ? (
                          <Badge className="bg-yellow-500 text-yellow-950">Warning</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-green-950">Good</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student view - show only their own attendance
  if (!userAttendance) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">Attendance</h3>
          <p className="text-muted-foreground">No attendance record found for your account.</p>
        </CardContent>
      </Card>
    );
  }

  const effectiveAbsences = calculateEffectiveAbsences(userAttendance);
  const status = getStatus(userAttendance);
  const penaltyAbsences = Math.max(0, effectiveAbsences - 3);
  const gradePenalty = status === 'DROPPED' ? 'DROPPED' : penaltyAbsences > 0 ? `${penaltyAbsences * 7}%` : '0%';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{userAttendance.excused_rehearsal_absences}</div>
            <p className="text-sm text-muted-foreground">EA Rehearsal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${userAttendance.unexcused_rehearsal_absences > 3 ? 'text-yellow-500' : 'text-foreground'}`}>
              {userAttendance.unexcused_rehearsal_absences}
            </div>
            <p className="text-sm text-muted-foreground">UA Rehearsal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{userAttendance.tardies}</div>
            <p className="text-sm text-muted-foreground">Tardies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{userAttendance.excused_performance_absences}</div>
            <p className="text-sm text-muted-foreground">EA Performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${userAttendance.unexcused_performance_absences > 0 ? 'text-red-500' : 'text-foreground'}`}>
              {userAttendance.unexcused_performance_absences}
            </div>
            <p className="text-sm text-muted-foreground">UA Performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${effectiveAbsences >= 6 ? 'text-red-500' : effectiveAbsences > 3 ? 'text-yellow-500' : 'text-green-500'}`}>
              {effectiveAbsences}
            </div>
            <p className="text-sm text-muted-foreground">Effective Absences</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <UserCheck className="h-5 w-5 text-primary" />
            Your Attendance Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <span className="font-medium text-foreground">Status</span>
            {status === 'DROPPED' ? (
              <Badge variant="destructive">DROPPED</Badge>
            ) : status === 'At Risk' ? (
              <Badge className="bg-red-500/80 text-white">At Risk</Badge>
            ) : status === 'Warning' ? (
              <Badge className="bg-yellow-500 text-yellow-950">Warning</Badge>
            ) : (
              <Badge className="bg-green-500 text-green-950">Good Standing</Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <span className="font-medium text-foreground">Grade Penalty</span>
            <span className={status === 'DROPPED' ? 'text-red-500 font-bold' : 'text-foreground'}>{gradePenalty}</span>
          </div>
          
          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <h4 className="font-semibold flex items-center gap-2 mb-2 text-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Attendance Policy
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• EA = Excused Absence (with documentation)</li>
              <li>• UA = Unexcused Absence (counts toward penalty)</li>
              <li>• 3 UA allowed without penalty</li>
              <li>• Each UA beyond 3 = 7% grade reduction</li>
              <li>• 6+ effective absences = At Risk / DROPPED</li>
              <li>• Missing a performance (UA) = 2 unexcused absences</li>
              <li>• 3 tardies allowed; every 2 beyond = 1 absence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
