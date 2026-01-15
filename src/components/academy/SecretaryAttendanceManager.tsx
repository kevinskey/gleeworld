import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, Search, Download, CheckCircle, XCircle, Clock, AlertTriangle, Users, Calendar, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface SecretaryAttendanceManagerProps {
  courseId: string;
  courseName?: string;
}

interface AttendanceSummary {
  id: string;
  student_id: string;
  student_name: string;
  semester: string;
  excused_rehearsal_absences: number;
  unexcused_rehearsal_absences: number;
  tardies: number;
  excused_performance_absences: number;
  unexcused_performance_absences: number;
  is_dropped: boolean;
  dropped_at: string | null;
  dropped_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const SecretaryAttendanceManager: React.FC<SecretaryAttendanceManagerProps> = ({ 
  courseId, 
  courseName = 'Course' 
}) => {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [semester, setSemester] = useState('FALL 2025');
  const [editingStudent, setEditingStudent] = useState<AttendanceSummary | null>(null);
  const [editForm, setEditForm] = useState({
    excused_rehearsal_absences: 0,
    unexcused_rehearsal_absences: 0,
    tardies: 0,
    excused_performance_absences: 0,
    unexcused_performance_absences: 0,
    notes: ''
  });

  useEffect(() => {
    fetchAttendanceSummaries();
  }, [courseId, semester]);

  const fetchAttendanceSummaries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_course_attendance_summary')
        .select('*')
        .eq('course_id', courseId)
        .eq('semester', semester)
        .order('student_name');

      if (error) throw error;
      setSummaries(data || []);
    } catch (error) {
      console.error('Error fetching attendance summaries:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (student: AttendanceSummary) => {
    setEditingStudent(student);
    setEditForm({
      excused_rehearsal_absences: student.excused_rehearsal_absences,
      unexcused_rehearsal_absences: student.unexcused_rehearsal_absences,
      tardies: student.tardies,
      excused_performance_absences: student.excused_performance_absences,
      unexcused_performance_absences: student.unexcused_performance_absences,
      notes: student.notes || ''
    });
  };

  const saveAttendance = async () => {
    if (!editingStudent) return;

    try {
      const { error } = await supabase
        .from('gw_course_attendance_summary')
        .update({
          excused_rehearsal_absences: editForm.excused_rehearsal_absences,
          unexcused_rehearsal_absences: editForm.unexcused_rehearsal_absences,
          tardies: editForm.tardies,
          excused_performance_absences: editForm.excused_performance_absences,
          unexcused_performance_absences: editForm.unexcused_performance_absences,
          notes: editForm.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingStudent.id);

      if (error) throw error;
      
      toast.success('Attendance updated');
      setEditingStudent(null);
      fetchAttendanceSummaries();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const filteredSummaries = summaries.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalAbsences = (s: AttendanceSummary) => {
    return s.excused_rehearsal_absences + s.unexcused_rehearsal_absences + 
           s.excused_performance_absences + s.unexcused_performance_absences;
  };

  const getUnexcusedTotal = (s: AttendanceSummary) => {
    return s.unexcused_rehearsal_absences + s.unexcused_performance_absences;
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Excused Rehearsal', 'Unexcused Rehearsal', 'Tardies', 'Excused Performance', 'Unexcused Performance', 'Dropped', 'Notes'];
    const rows = filteredSummaries.map(s => [
      s.student_name,
      s.excused_rehearsal_absences,
      s.unexcused_rehearsal_absences,
      s.tardies,
      s.excused_performance_absences,
      s.unexcused_performance_absences,
      s.is_dropped ? 'Yes' : 'No',
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${courseName.replace(/\s/g, '_')}_${semester}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance exported to CSV');
  };

  // Calculate overall stats
  const totalStudents = summaries.filter(s => !s.is_dropped).length;
  const droppedStudents = summaries.filter(s => s.is_dropped).length;
  const studentsWithIssues = summaries.filter(s => !s.is_dropped && getUnexcusedTotal(s) >= 3).length;
  const totalTardies = summaries.reduce((acc, s) => acc + s.tardies, 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Secretary Attendance Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage and review attendance records for {courseName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FALL 2025">Fall 2025</SelectItem>
              <SelectItem value="SPRING 2025">Spring 2025</SelectItem>
              <SelectItem value="FALL 2024">Fall 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Active Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <div className="text-2xl font-bold text-red-600">{droppedStudents}</div>
            <p className="text-xs text-muted-foreground">Dropped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <div className="text-2xl font-bold text-yellow-600">{studentsWithIssues}</div>
            <p className="text-xs text-muted-foreground">3+ Unexcused</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <div className="text-2xl font-bold text-orange-600">{totalTardies}</div>
            <p className="text-xs text-muted-foreground">Total Tardies</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Attendance Summary</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading attendance data...</p>
          ) : filteredSummaries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center" title="Excused Rehearsal Absences">Ex. Reh.</TableHead>
                    <TableHead className="text-center" title="Unexcused Rehearsal Absences">Unex. Reh.</TableHead>
                    <TableHead className="text-center">Tardies</TableHead>
                    <TableHead className="text-center" title="Excused Performance Absences">Ex. Perf.</TableHead>
                    <TableHead className="text-center" title="Unexcused Performance Absences">Unex. Perf.</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((student) => (
                    <TableRow key={student.id} className={student.is_dropped ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">
                        {student.student_name}
                        {student.notes && (
                          <span className="ml-2 text-xs text-muted-foreground" title={student.notes}>📝</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-blue-600">{student.excused_rehearsal_absences}</TableCell>
                      <TableCell className="text-center text-red-600">{student.unexcused_rehearsal_absences}</TableCell>
                      <TableCell className="text-center text-orange-600">{student.tardies}</TableCell>
                      <TableCell className="text-center text-blue-600">{student.excused_performance_absences}</TableCell>
                      <TableCell className="text-center text-red-600">{student.unexcused_performance_absences}</TableCell>
                      <TableCell className="text-center">
                        {student.is_dropped ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Dropped
                          </Badge>
                        ) : getUnexcusedTotal(student) >= 3 ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Warning
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Good
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(student)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance - {editingStudent?.student_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Excused Rehearsal Absences</Label>
              <Input
                type="number"
                min={0}
                value={editForm.excused_rehearsal_absences}
                onChange={(e) => setEditForm({ ...editForm, excused_rehearsal_absences: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Unexcused Rehearsal Absences</Label>
              <Input
                type="number"
                min={0}
                value={editForm.unexcused_rehearsal_absences}
                onChange={(e) => setEditForm({ ...editForm, unexcused_rehearsal_absences: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Tardies</Label>
              <Input
                type="number"
                min={0}
                value={editForm.tardies}
                onChange={(e) => setEditForm({ ...editForm, tardies: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Excused Performance Absences</Label>
              <Input
                type="number"
                min={0}
                value={editForm.excused_performance_absences}
                onChange={(e) => setEditForm({ ...editForm, excused_performance_absences: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Unexcused Performance Absences</Label>
              <Input
                type="number"
                min={0}
                value={editForm.unexcused_performance_absences}
                onChange={(e) => setEditForm({ ...editForm, unexcused_performance_absences: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Add any notes about this student's attendance..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
            <Button onClick={saveAttendance}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
