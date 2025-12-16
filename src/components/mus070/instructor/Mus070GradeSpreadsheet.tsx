import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// MUS 070 Grade weights per Glee Club Handbook
const GRADE_WEIGHTS = {
  sectionals: 25,      // Sectionals & Rehearsals
  sightSinging: 25,    // Sight Singing / Music Reading
  performances: 50,    // Performances
};

// Attendance policy constants
const MAX_ABSENCES_NO_PENALTY = 3;
const MAX_ABSENCES_BEFORE_DROP = 6;
const MAX_TARDIES_NO_PENALTY = 3;
const TARDIES_PER_ABSENCE = 2;

// Grading scale per handbook
const getLetterGrade = (percentage: number): string => {
  if (percentage >= 95) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 65) return 'D+';
  if (percentage >= 60) return 'D';
  return 'F';
};

// Calculate grade penalty from absences
const calculateAbsencePenalty = (absences: number): number => {
  const excessAbsences = Math.max(0, absences - MAX_ABSENCES_NO_PENALTY);
  // Each excess absence = 1 letter grade drop ≈ 7% penalty
  return excessAbsences * 7;
};

interface StudentGradeRow {
  student_id: string;
  student_name: string;
  sectionals_pct: number;
  sight_singing_pct: number;
  performances_pct: number;
  absences: number;
  tardies: number;
  effective_absences: number;
  raw_grade_pct: number;
  final_grade_pct: number;
  letter_grade: string;
  is_dropped: boolean;
}

type GradeField = 'sectionals_pct' | 'sight_singing_pct' | 'performances_pct';
type SortField = 'student_name' | GradeField | 'final_grade' | 'absences';
type SortDirection = 'asc' | 'desc';

export const Mus070GradeSpreadsheet: React.FC = () => {
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<GradeField, number>>>>({});
  const [sortField, setSortField] = useState<SortField>('student_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleOverride = (studentId: string, field: GradeField, value: number) => {
    const maxValues: Record<GradeField, number> = {
      sectionals_pct: GRADE_WEIGHTS.sectionals,
      sight_singing_pct: GRADE_WEIGHTS.sightSinging,
      performances_pct: GRADE_WEIGHTS.performances,
    };
    const clampedValue = Math.min(Math.max(0, value), maxValues[field]);
    
    setOverrides(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: clampedValue
      }
    }));
  };

  const getEffectiveValue = (student: StudentGradeRow, field: GradeField): number => {
    return overrides[student.student_id]?.[field] ?? student[field];
  };

  const calculateFinalGrade = (student: StudentGradeRow): number => {
    if (student.is_dropped) return 0;
    
    const rawTotal = 
      getEffectiveValue(student, 'sectionals_pct') +
      getEffectiveValue(student, 'sight_singing_pct') +
      getEffectiveValue(student, 'performances_pct');
    
    const penalty = calculateAbsencePenalty(student.effective_absences);
    return Math.max(0, rawTotal - penalty);
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);

      // Get Glee Club members (role = 'member')
      const { data: members, error: membersError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .eq('role', 'member');

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setStudents([]);
        return;
      }

      const studentIds = members.map(m => m.user_id);

      // Fetch attendance data for Glee Club events
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('user_id, status, event_id, events(event_type)')
        .in('user_id', studentIds);

      if (attendanceError) throw attendanceError;

      // Process attendance by student
      const attendanceByStudent = new Map<string, { absences: number; tardies: number; missedPerformances: number }>();
      
      (attendanceData || []).forEach((record: any) => {
        const studentId = record.user_id;
        if (!attendanceByStudent.has(studentId)) {
          attendanceByStudent.set(studentId, { absences: 0, tardies: 0, missedPerformances: 0 });
        }
        const data = attendanceByStudent.get(studentId)!;
        
        const isPerformance = record.events?.event_type === 'performance' || 
                              record.events?.event_type === 'concert';
        
        if (record.status === 'absent') {
          if (isPerformance) {
            data.missedPerformances++;
          } else {
            data.absences++;
          }
        } else if (record.status === 'tardy' || record.status === 'late') {
          data.tardies++;
        }
      });

      // Calculate grades for each member
      const studentGrades: StudentGradeRow[] = members.map((member: any) => {
        const studentId = member.user_id;
        const studentName = member.full_name || 'Unknown';
        const attendance = attendanceByStudent.get(studentId) || { absences: 0, tardies: 0, missedPerformances: 0 };

        // Calculate effective absences
        // Each missed performance = 2 absences
        // Every 2 tardies beyond 3 = 1 absence
        const excessTardies = Math.max(0, attendance.tardies - MAX_TARDIES_NO_PENALTY);
        const tardyAbsences = Math.floor(excessTardies / TARDIES_PER_ABSENCE);
        const performanceAbsences = attendance.missedPerformances * 2;
        const effectiveAbsences = attendance.absences + tardyAbsences + performanceAbsences;

        const isDropped = effectiveAbsences >= MAX_ABSENCES_BEFORE_DROP;

        // Default to full marks if no specific grading data exists
        // In production, this would pull from specific MUS070 grading tables
        const sectionalsScore = GRADE_WEIGHTS.sectionals;
        const sightSingingScore = GRADE_WEIGHTS.sightSinging;
        const performancesScore = isDropped ? 0 : GRADE_WEIGHTS.performances;

        const rawGrade = sectionalsScore + sightSingingScore + performancesScore;
        const penalty = calculateAbsencePenalty(effectiveAbsences);
        const finalGrade = isDropped ? 0 : Math.max(0, rawGrade - penalty);

        return {
          student_id: studentId,
          student_name: studentName,
          sectionals_pct: sectionalsScore,
          sight_singing_pct: sightSingingScore,
          performances_pct: performancesScore,
          absences: attendance.absences + performanceAbsences,
          tardies: attendance.tardies,
          effective_absences: effectiveAbsences,
          raw_grade_pct: rawGrade,
          final_grade_pct: finalGrade,
          letter_grade: getLetterGrade(finalGrade),
          is_dropped: isDropped,
        };
      });

      // Deduplicate by student_id
      const uniqueGrades = studentGrades.filter((student, index, self) =>
        index === self.findIndex(s => s.student_id === student.student_id)
      );

      setStudents(uniqueGrades);
    } catch (error) {
      console.error('Error fetching MUS 070 grades:', error);
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Sectionals (25%)', 'Sight Singing (25%)', 'Performances (50%)', 'Absences', 'Tardies', 'Final Grade (%)', 'Letter Grade', 'Status'];
    const rows = sortedAndFilteredStudents.map(s => [
      s.student_name,
      getEffectiveValue(s, 'sectionals_pct').toFixed(1),
      getEffectiveValue(s, 'sight_singing_pct').toFixed(1),
      getEffectiveValue(s, 'performances_pct').toFixed(1),
      s.effective_absences,
      s.tardies,
      calculateFinalGrade(s).toFixed(1),
      getLetterGrade(calculateFinalGrade(s)),
      s.is_dropped ? 'DROPPED' : 'Active'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mus070_glee_club_grades.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Grades exported');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'student_name' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getLastName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1].toLowerCase();
  };

  const sortedAndFilteredStudents = useMemo(() => {
    const filtered = students.filter(s =>
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === 'student_name') {
        aVal = getLastName(a.student_name);
        bVal = getLastName(b.student_name);
      } else if (sortField === 'final_grade') {
        aVal = calculateFinalGrade(a);
        bVal = calculateFinalGrade(b);
      } else if (sortField === 'absences') {
        aVal = a.effective_absences;
        bVal = b.effective_absences;
      } else {
        aVal = getEffectiveValue(a, sortField);
        bVal = getEffectiveValue(b, sortField);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, searchTerm, sortField, sortDirection, overrides]);

  const getGradeColor = (grade: number, isDropped: boolean) => {
    if (isDropped) return 'text-destructive font-bold';
    if (grade >= 90) return 'text-green-600 dark:text-green-400';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (grade >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-destructive';
  };

  const getAbsenceColor = (absences: number) => {
    if (absences >= MAX_ABSENCES_BEFORE_DROP) return 'text-destructive font-bold';
    if (absences > MAX_ABSENCES_NO_PENALTY) return 'text-orange-600 dark:text-orange-400';
    return 'text-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">MUS 070 - Glee Club Grade Sheet</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Per Glee Club Handbook grading policy
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-48"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchGrades} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-2 space-y-1">
          <div>
            <strong>Weights:</strong> Sectionals & Rehearsals {GRADE_WEIGHTS.sectionals}% | 
            Sight Singing {GRADE_WEIGHTS.sightSinging}% | 
            Performances {GRADE_WEIGHTS.performances}%
          </div>
          <div className="text-xs">
            <strong>Attendance:</strong> 3 absences allowed | Beyond 3 = grade drops one letter per absence | 
            6 absences = dropped | Missing performance = 2 absences
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No Glee Club members found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('student_name')}
                  >
                    <div className="flex items-center">
                      <span>Student Name <span className="text-xs text-muted-foreground">(by last)</span></span> 
                      {getSortIcon('student_name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('sectionals_pct')}
                  >
                    <div className="flex items-center justify-center">
                      Sectionals ({GRADE_WEIGHTS.sectionals}%) {getSortIcon('sectionals_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('sight_singing_pct')}
                  >
                    <div className="flex items-center justify-center">
                      Sight Singing ({GRADE_WEIGHTS.sightSinging}%) {getSortIcon('sight_singing_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('performances_pct')}
                  >
                    <div className="flex items-center justify-center">
                      Performances ({GRADE_WEIGHTS.performances}%) {getSortIcon('performances_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('absences')}
                  >
                    <div className="flex items-center justify-center">
                      Absences {getSortIcon('absences')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground">
                    Tardies
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground font-bold cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('final_grade')}
                  >
                    <div className="flex items-center justify-center">
                      Final Grade {getSortIcon('final_grade')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground">
                    Letter
                  </TableHead>
                  <TableHead className="text-center text-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredStudents.map((student) => {
                  const finalGrade = calculateFinalGrade(student);
                  const letterGrade = getLetterGrade(finalGrade);
                  
                  return (
                    <TableRow key={student.student_id} className={student.is_dropped ? 'bg-destructive/10' : ''}>
                      <TableCell className="font-medium text-foreground">
                        {student.student_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          max={GRADE_WEIGHTS.sectionals}
                          step="0.5"
                          value={getEffectiveValue(student, 'sectionals_pct')}
                          onChange={(e) => handleOverride(student.student_id, 'sectionals_pct', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center mx-auto h-8"
                          disabled={student.is_dropped}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          max={GRADE_WEIGHTS.sightSinging}
                          step="0.5"
                          value={getEffectiveValue(student, 'sight_singing_pct')}
                          onChange={(e) => handleOverride(student.student_id, 'sight_singing_pct', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center mx-auto h-8"
                          disabled={student.is_dropped}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          max={GRADE_WEIGHTS.performances}
                          step="0.5"
                          value={getEffectiveValue(student, 'performances_pct')}
                          onChange={(e) => handleOverride(student.student_id, 'performances_pct', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center mx-auto h-8"
                          disabled={student.is_dropped}
                        />
                      </TableCell>
                      <TableCell className={`text-center ${getAbsenceColor(student.effective_absences)}`}>
                        {student.effective_absences}
                        {student.effective_absences > MAX_ABSENCES_NO_PENALTY && (
                          <AlertTriangle className="h-3 w-3 inline ml-1" />
                        )}
                      </TableCell>
                      <TableCell className="text-center text-foreground">
                        {student.tardies}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${getGradeColor(finalGrade, student.is_dropped)}`}>
                        {student.is_dropped ? '0.0' : finalGrade.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-center font-bold ${getGradeColor(finalGrade, student.is_dropped)}`}>
                        {student.is_dropped ? 'F' : letterGrade}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.is_dropped ? (
                          <Badge variant="destructive">DROPPED</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Summary Stats */}
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span>Total Members: {students.length}</span>
          <span>Active: {students.filter(s => !s.is_dropped).length}</span>
          <span className="text-destructive">Dropped: {students.filter(s => s.is_dropped).length}</span>
          <span>Avg Grade: {students.length > 0 
            ? (students.filter(s => !s.is_dropped).reduce((sum, s) => sum + calculateFinalGrade(s), 0) / 
               Math.max(1, students.filter(s => !s.is_dropped).length)).toFixed(1) 
            : 0}%</span>
        </div>
      </CardContent>
    </Card>
  );
};
