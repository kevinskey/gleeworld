import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  UserCheck,
  UserX,
  Edit2,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AttendanceRecord } from '@/hooks/useAttendanceSessions';
import { format } from 'date-fns';

interface EnrolledStudent {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url?: string;
}

interface AttendanceLiveRosterProps {
  sessionId: string;
  courseId: string;
  records: AttendanceRecord[];
  markAttendance: (studentId: string, status: AttendanceRecord['status'], note?: string) => Promise<void>;
  loading: boolean;
}

export const AttendanceLiveRoster: React.FC<AttendanceLiveRosterProps> = ({
  sessionId,
  courseId,
  records,
  markAttendance,
  loading,
}) => {
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchEnrolledStudents();
  }, [courseId]);

  const fetchEnrolledStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_enrollments')
        .select('id, user_id')
        .eq('course_id', courseId)
        .eq('status', 'active');

      if (error) throw error;

      // Fetch profiles separately
      const userIds = (data || []).map(e => e.user_id);
      if (userIds.length === 0) {
        setEnrolledStudents([]);
        return;
      }
      
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const students: EnrolledStudent[] = (data || []).map(enrollment => {
        const profile = profileMap.get(enrollment.user_id);
        return {
          id: enrollment.id,
          user_id: enrollment.user_id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          profile_image_url: undefined,
        };
      });

      setEnrolledStudents(students);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
    }
  };

  const getStudentRecord = (userId: string) => {
    return records.find(r => r.student_profile_id === userId);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'excused':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'present':
        return 'default';
      case 'late':
        return 'secondary';
      case 'absent':
        return 'destructive';
      case 'excused':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleMarkAttendance = async (studentId: string, status: AttendanceRecord['status']) => {
    await markAttendance(studentId, status);
  };

  const handleSaveNote = async (studentId: string) => {
    await markAttendance(studentId, getStudentRecord(studentId)?.status || 'present', noteText);
    setEditingNote(null);
    setNoteText('');
  };

  const filteredStudents = enrolledStudents.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    total: enrolledStudents.length,
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    excused: records.filter(r => r.status === 'excused').length,
    unmarked: enrolledStudents.length - records.length,
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Enrolled</div>
        </Card>
        <Card className="p-3 text-center bg-green-50 dark:bg-green-950/20">
          <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          <div className="text-xs text-muted-foreground">Present</div>
        </Card>
        <Card className="p-3 text-center bg-yellow-50 dark:bg-yellow-950/20">
          <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          <div className="text-xs text-muted-foreground">Late</div>
        </Card>
        <Card className="p-3 text-center bg-red-50 dark:bg-red-950/20">
          <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          <div className="text-xs text-muted-foreground">Absent</div>
        </Card>
        <Card className="p-3 text-center bg-blue-50 dark:bg-blue-950/20">
          <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
          <div className="text-xs text-muted-foreground">Excused</div>
        </Card>
        <Card className="p-3 text-center bg-muted/50">
          <div className="text-2xl font-bold text-muted-foreground">{stats.unmarked}</div>
          <div className="text-xs text-muted-foreground">Unmarked</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Roster List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Live Roster ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {filteredStudents.map(student => {
                const record = getStudentRecord(student.user_id);
                const isEditing = editingNote === student.user_id;

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.profile_image_url} />
                        <AvatarFallback>
                          {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        {record?.marked_at && (
                          <p className="text-xs text-muted-foreground">
                            Checked in: {format(new Date(record.marked_at), 'h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status indicator */}
                      {getStatusIcon(record?.status)}
                      
                      {/* Quick action buttons */}
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant={record?.status === 'present' ? 'default' : 'outline'}
                          className="h-8 w-8"
                          onClick={() => handleMarkAttendance(student.user_id, 'present')}
                          title="Mark Present"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={record?.status === 'late' ? 'secondary' : 'outline'}
                          className="h-8 w-8"
                          onClick={() => handleMarkAttendance(student.user_id, 'late')}
                          title="Mark Late"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={record?.status === 'absent' ? 'destructive' : 'outline'}
                          className="h-8 w-8"
                          onClick={() => handleMarkAttendance(student.user_id, 'absent')}
                          title="Mark Absent"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Select
                          value={record?.status || ''}
                          onValueChange={(value) => handleMarkAttendance(student.user_id, value as AttendanceRecord['status'])}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Note button */}
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="h-8 w-32"
                            placeholder="Add note..."
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleSaveNote(student.user_id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingNote(student.user_id);
                            setNoteText(record?.note || '');
                          }}
                          title="Add/Edit Note"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery ? 'No students match your search' : 'No students enrolled'}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
