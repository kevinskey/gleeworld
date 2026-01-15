import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Search, Download, XCircle, Clock, AlertTriangle, Users, Save, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface SecretaryAttendanceManagerProps {
  courseId: string;
  courseName?: string;
}

interface EnrolledStudent {
  student_profile_id: string;
  full_name: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  excused_rehearsal_absences: number;
  unexcused_rehearsal_absences: number;
  tardies: number;
  excused_performance_absences: number;
  unexcused_performance_absences: number;
  is_dropped: boolean;
  notes: string | null;
  isDirty?: boolean;
  isNew?: boolean;
}

export const SecretaryAttendanceManager: React.FC<SecretaryAttendanceManagerProps> = ({ 
  courseId, 
  courseName = 'Course' 
}) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [semester, setSemester] = useState('FALL 2025');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch enrolled students for this course using student_profile_id
      const { data: enrollments, error: enrollError } = await supabase
        .from('gw_course_enrollments')
        .select(`
          student_profile_id,
          gw_student_profiles!inner(full_name, email)
        `)
        .eq('course_id', courseId)
        .eq('enrollment_status', 'enrolled');

      if (enrollError) throw enrollError;

      const students: EnrolledStudent[] = (enrollments || [])
        .filter(e => e.student_profile_id && e.gw_student_profiles)
        .map(e => ({
          student_profile_id: e.student_profile_id!,
          full_name: (e.gw_student_profiles as any)?.full_name || 'Unknown',
          email: (e.gw_student_profiles as any)?.email || ''
        }));

      setEnrolledStudents(students);

      // Fetch existing attendance records
      const { data: attendance, error: attError } = await supabase
        .from('gw_course_attendance_summary')
        .select('*')
        .eq('course_id', courseId)
        .eq('semester', semester);

      if (attError) throw attError;

      // Merge: show enrolled students with their attendance (or create blank records)
      const records: AttendanceRecord[] = students.map(student => {
        const existing = (attendance || []).find(a => a.student_id === student.student_profile_id);
        if (existing) {
          return {
            id: existing.id,
            student_id: existing.student_id || student.student_profile_id,
            student_name: existing.student_name || student.full_name,
            excused_rehearsal_absences: existing.excused_rehearsal_absences || 0,
            unexcused_rehearsal_absences: existing.unexcused_rehearsal_absences || 0,
            tardies: existing.tardies || 0,
            excused_performance_absences: existing.excused_performance_absences || 0,
            unexcused_performance_absences: existing.unexcused_performance_absences || 0,
            is_dropped: existing.is_dropped || false,
            notes: existing.notes,
            isDirty: false,
            isNew: false
          };
        } else {
          return {
            id: `new-${student.student_profile_id}`,
            student_id: student.student_profile_id,
            student_name: student.full_name,
            excused_rehearsal_absences: 0,
            unexcused_rehearsal_absences: 0,
            tardies: 0,
            excused_performance_absences: 0,
            unexcused_performance_absences: 0,
            is_dropped: false,
            notes: null,
            isDirty: false,
            isNew: true
          };
        }
      });

      // Sort alphabetically
      records.sort((a, b) => a.student_name.localeCompare(b.student_name));
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [courseId, semester]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCell = (studentId: string, field: keyof AttendanceRecord, value: number | string | boolean) => {
    setAttendanceRecords(prev => prev.map(record => {
      if (record.student_id === studentId) {
        return { ...record, [field]: value, isDirty: true };
      }
      return record;
    }));
  };

  const saveAllChanges = async () => {
    const dirtyRecords = attendanceRecords.filter(r => r.isDirty);
    if (dirtyRecords.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      for (const record of dirtyRecords) {
        const payload = {
          course_id: courseId,
          student_id: record.student_id,
          student_name: record.student_name,
          semester: semester,
          excused_rehearsal_absences: record.excused_rehearsal_absences,
          unexcused_rehearsal_absences: record.unexcused_rehearsal_absences,
          tardies: record.tardies,
          excused_performance_absences: record.excused_performance_absences,
          unexcused_performance_absences: record.unexcused_performance_absences,
          is_dropped: record.is_dropped,
          notes: record.notes,
          updated_at: new Date().toISOString()
        };

        if (record.isNew) {
          const { error } = await supabase
            .from('gw_course_attendance_summary')
            .insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('gw_course_attendance_summary')
            .update(payload)
            .eq('id', record.id);
          if (error) throw error;
        }
      }

      toast.success(`Saved ${dirtyRecords.length} record(s)`);
      fetchData(); // Refresh to get updated IDs
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Ex. Rehearsal', 'Unex. Rehearsal', 'Tardies', 'Ex. Performance', 'Unex. Performance', 'Status', 'Notes'];
    const rows = filteredRecords.map(r => [
      r.student_name,
      r.excused_rehearsal_absences,
      r.unexcused_rehearsal_absences,
      r.tardies,
      r.excused_performance_absences,
      r.unexcused_performance_absences,
      r.is_dropped ? 'Dropped' : 'Active',
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${courseName.replace(/\s/g, '_')}_${semester}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const filteredRecords = attendanceRecords.filter(r =>
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUnexcusedTotal = (r: AttendanceRecord) =>
    r.unexcused_rehearsal_absences + r.unexcused_performance_absences;

  const hasUnsavedChanges = attendanceRecords.some(r => r.isDirty);
  const totalStudents = attendanceRecords.filter(r => !r.is_dropped).length;
  const droppedStudents = attendanceRecords.filter(r => r.is_dropped).length;
  const studentsWithWarning = attendanceRecords.filter(r => !r.is_dropped && getUnexcusedTotal(r) >= 3).length;
  const totalTardies = attendanceRecords.reduce((acc, r) => acc + r.tardies, 0);

  // Number input cell component
  const NumberCell = ({ value, onChange, className = '' }: { value: number; onChange: (v: number) => void; className?: string }) => (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className={`w-12 h-7 text-center text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
    />
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Attendance Manager: {courseName}
          </h2>
          <p className="text-xs text-muted-foreground">
            Excel-style grid • {enrolledStudents.length} enrolled students
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FALL 2025">Fall 2025</SelectItem>
              <SelectItem value="SPRING 2025">Spring 2025</SelectItem>
              <SelectItem value="FALL 2024">Fall 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button 
            size="sm" 
            onClick={saveAllChanges} 
            disabled={!hasUnsavedChanges || saving}
            className={hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Save className="h-3 w-3 mr-1" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <div className="text-lg font-bold">{totalStudents}</div>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <div className="text-lg font-bold text-red-600">{droppedStudents}</div>
              <p className="text-[10px] text-muted-foreground">Dropped</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <div>
              <div className="text-lg font-bold text-yellow-600">{studentsWithWarning}</div>
              <p className="text-[10px] text-muted-foreground">3+ Unexcused</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-lg font-bold text-orange-600">{totalTardies}</div>
              <p className="text-[10px] text-muted-foreground">Tardies</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-64">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Excel-like Grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {enrolledStudents.length === 0 
                ? 'No students enrolled in this course yet.' 
                : 'No matching students found.'}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                {/* Header Row */}
                <div className="grid grid-cols-[200px_60px_60px_60px_60px_60px_70px_1fr] gap-1 p-2 bg-muted/50 border-b font-medium text-xs sticky top-0">
                  <div className="px-2">Student Name</div>
                  <div className="text-center" title="Excused Rehearsal">Ex.R</div>
                  <div className="text-center" title="Unexcused Rehearsal">Un.R</div>
                  <div className="text-center">Tard</div>
                  <div className="text-center" title="Excused Performance">Ex.P</div>
                  <div className="text-center" title="Unexcused Performance">Un.P</div>
                  <div className="text-center">Status</div>
                  <div className="px-2">Notes</div>
                </div>

                {/* Data Rows */}
                {filteredRecords.map((record, idx) => (
                  <div 
                    key={record.student_id}
                    className={`grid grid-cols-[200px_60px_60px_60px_60px_60px_70px_1fr] gap-1 p-1 border-b items-center text-xs
                      ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                      ${record.isDirty ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                      ${record.is_dropped ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="px-2 font-medium truncate flex items-center gap-1">
                      {record.isNew && <Plus className="h-3 w-3 text-green-500" />}
                      {record.student_name}
                    </div>
                    <div className="flex justify-center">
                      <NumberCell 
                        value={record.excused_rehearsal_absences} 
                        onChange={(v) => updateCell(record.student_id, 'excused_rehearsal_absences', v)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <NumberCell 
                        value={record.unexcused_rehearsal_absences} 
                        onChange={(v) => updateCell(record.student_id, 'unexcused_rehearsal_absences', v)}
                        className={record.unexcused_rehearsal_absences > 0 ? 'text-red-600 border-red-300' : ''}
                      />
                    </div>
                    <div className="flex justify-center">
                      <NumberCell 
                        value={record.tardies} 
                        onChange={(v) => updateCell(record.student_id, 'tardies', v)}
                        className={record.tardies > 0 ? 'text-orange-600 border-orange-300' : ''}
                      />
                    </div>
                    <div className="flex justify-center">
                      <NumberCell 
                        value={record.excused_performance_absences} 
                        onChange={(v) => updateCell(record.student_id, 'excused_performance_absences', v)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <NumberCell 
                        value={record.unexcused_performance_absences} 
                        onChange={(v) => updateCell(record.student_id, 'unexcused_performance_absences', v)}
                        className={record.unexcused_performance_absences > 0 ? 'text-red-600 border-red-300' : ''}
                      />
                    </div>
                    <div className="flex justify-center">
                      <select
                        value={record.is_dropped ? 'dropped' : 'active'}
                        onChange={(e) => updateCell(record.student_id, 'is_dropped', e.target.value === 'dropped')}
                        className="h-7 text-[10px] border border-border rounded bg-background px-1"
                      >
                        <option value="active">Active</option>
                        <option value="dropped">Dropped</option>
                      </select>
                    </div>
                    <div className="px-1">
                      <input
                        type="text"
                        value={record.notes || ''}
                        onChange={(e) => updateCell(record.student_id, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        className="w-full h-7 text-xs border border-border rounded bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-50 border border-yellow-300 rounded" />
          Unsaved changes
        </span>
        <span className="flex items-center gap-1">
          <Plus className="h-3 w-3 text-green-500" />
          New record
        </span>
        <span>Ex.R = Excused Rehearsal • Un.R = Unexcused Rehearsal • Tard = Tardies • Ex.P/Un.P = Performance</span>
      </div>
    </div>
  );
};
