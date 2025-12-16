import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

// Official Fall 2025 Grades from Secretary's spreadsheet
const OFFICIAL_GRADES: Record<string, { grade: string; ea_rehearsal: number; ua_rehearsal: number; tardies: number; ea_performance: number; ua_performance: number; dropped?: boolean }> = {
  "Aaliyah Deere": { grade: "A", ea_rehearsal: 10, ua_rehearsal: 3, tardies: 0, ea_performance: 4, ua_performance: 0 },
  "Adrianna Highgate": { grade: "A", ea_rehearsal: 7, ua_rehearsal: 0, tardies: 0, ea_performance: 0, ua_performance: 1 },
  "Afia Amoako-Boateng": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 1, tardies: 1, ea_performance: 1, ua_performance: 0 },
  "Ahbri Graves": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 0, tardies: 2, ea_performance: 1, ua_performance: 1 },
  "Ainka-Amara Williams": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 2, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Akua Peprah": { grade: "D", ea_rehearsal: 1, ua_rehearsal: 3, tardies: 9, ea_performance: 1, ua_performance: 0 },
  "Alejandra Adelman": { grade: "A", ea_rehearsal: 1, ua_rehearsal: 0, tardies: 1, ea_performance: 0, ua_performance: 1 },
  "Alexandra Williams": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 2, tardies: 0, ea_performance: 1, ua_performance: 0 },
  "Allana Walker": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 0, tardies: 0, ea_performance: 3, ua_performance: 0 },
  "Ariana Singleton": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 1, tardies: 2, ea_performance: 1, ua_performance: 0 },
  "Ariana Swindell": { grade: "A", ea_rehearsal: 6, ua_rehearsal: 0, tardies: 1, ea_performance: 1, ua_performance: 0 },
  "Ashlyn White": { grade: "F", ea_rehearsal: 1, ua_rehearsal: 8, tardies: 3, ea_performance: 0, ua_performance: 3 },
  "Autumn Brooks": { grade: "A", ea_rehearsal: 7, ua_rehearsal: 2, tardies: 6, ea_performance: 4, ua_performance: 0 },
  "Ava Challenger": { grade: "A", ea_rehearsal: 7, ua_rehearsal: 1, tardies: 2, ea_performance: 1, ua_performance: 0 },
  "Ava Russell": { grade: "B", ea_rehearsal: 5, ua_rehearsal: 4, tardies: 1, ea_performance: 0, ua_performance: 0 },
  "Caitlyn Oppong": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 0, tardies: 1, ea_performance: 2, ua_performance: 0 },
  "Cameron Tolliver": { grade: "A", ea_rehearsal: 0, ua_rehearsal: 2, tardies: 1, ea_performance: 0, ua_performance: 0 },
  "Camryn Williams": { grade: "F", ea_rehearsal: 8, ua_rehearsal: 3, tardies: 8, ea_performance: 2, ua_performance: 1 },
  "Carrington Wash": { grade: "A", ea_rehearsal: 10, ua_rehearsal: 0, tardies: 6, ea_performance: 2, ua_performance: 0 },
  "Carson Smedley": { grade: "A", ea_rehearsal: 7, ua_rehearsal: 0, tardies: 0, ea_performance: 1, ua_performance: 1 },
  "Charity Dent": { grade: "A", ea_rehearsal: 11, ua_rehearsal: 1, tardies: 2, ea_performance: 2, ua_performance: 0 },
  "Chloe Bennett": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 2, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Dana Thompson": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 1, tardies: 5, ea_performance: 0, ua_performance: 0 },
  "Drew Roberts": { grade: "A", ea_rehearsal: 1, ua_rehearsal: 0, tardies: 2, ea_performance: 0, ua_performance: 0 },
  "Elissa Jefferson": { grade: "A", ea_rehearsal: 6, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Gabrielle Magee": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 1, tardies: 0, ea_performance: 1, ua_performance: 0 },
  "Hannah Hunter": { grade: "A", ea_rehearsal: 0, ua_rehearsal: 1, tardies: 1, ea_performance: 0, ua_performance: 0 },
  "Hayley Ponds": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Imani Obuhoro": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 0, tardies: 0, ea_performance: 0, ua_performance: 1 },
  "Isabella Vesprini": { grade: "C", ea_rehearsal: 13, ua_rehearsal: 1, tardies: 2, ea_performance: 1, ua_performance: 1 },
  "Jada Jones": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 3, tardies: 1, ea_performance: 0, ua_performance: 0 },
  "Jade Washington": { grade: "B", ea_rehearsal: 17, ua_rehearsal: 4, tardies: 3, ea_performance: 3, ua_performance: 0 },
  "Jailah Shepherd": { grade: "A", ea_rehearsal: 6, ua_rehearsal: 0, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Jamaya Grant": { grade: "C", ea_rehearsal: 2, ua_rehearsal: 2, tardies: 5, ea_performance: 1, ua_performance: 1 },
  "Janiah Collier": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 1, tardies: 0, ea_performance: 2, ua_performance: 0 },
  "Jaylin Harvey": { grade: "A", ea_rehearsal: 1, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Jeneva Preval": { grade: "A", ea_rehearsal: 8, ua_rehearsal: 0, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Jessica Obi": { grade: "A", ea_rehearsal: 9, ua_rehearsal: 0, tardies: 1, ea_performance: 2, ua_performance: 0 },
  "Jewel Walker": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 3, tardies: 1, ea_performance: 1, ua_performance: 0 },
  "Jillian Collier": { grade: "F", ea_rehearsal: 11, ua_rehearsal: 4, tardies: 5, ea_performance: 0, ua_performance: 2 },
  "Jordan Lawrence": { grade: "A", ea_rehearsal: 16, ua_rehearsal: 0, tardies: 2, ea_performance: 1, ua_performance: 0, dropped: true },
  "Jordan Marshall": { grade: "F", ea_rehearsal: 6, ua_rehearsal: 6, tardies: 7, ea_performance: 2, ua_performance: 0 },
  "Jordyn O'Neal": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Judy McClure-Anim": { grade: "D", ea_rehearsal: 9, ua_rehearsal: 3, tardies: 9, ea_performance: 1, ua_performance: 0 },
  "Julienne Angu": { grade: "C", ea_rehearsal: 11, ua_rehearsal: 4, tardies: 5, ea_performance: 3, ua_performance: 0, dropped: true },
  "Kathryn Tucker": { grade: "B", ea_rehearsal: 1, ua_rehearsal: 2, tardies: 5, ea_performance: 2, ua_performance: 0 },
  "Kayla Dock": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 0, tardies: 1, ea_performance: 1, ua_performance: 0 },
  "Kaylana Barnes": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Kaylen Coleman": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Kelsey Korondo": { grade: "C", ea_rehearsal: 7, ua_rehearsal: 1, tardies: 1, ea_performance: 1, ua_performance: 2 },
  "Kendall Felton": { grade: "C", ea_rehearsal: 5, ua_rehearsal: 4, tardies: 5, ea_performance: 1, ua_performance: 0 },
  "Kennedi Henderson": { grade: "F", ea_rehearsal: 5, ua_rehearsal: 6, tardies: 3, ea_performance: 0, ua_performance: 1 },
  "Kennedy Benion": { grade: "A", ea_rehearsal: 8, ua_rehearsal: 1, tardies: 3, ea_performance: 0, ua_performance: 1 },
  "Kennedy Rogers": { grade: "A", ea_rehearsal: 6, ua_rehearsal: 1, tardies: 7, ea_performance: 2, ua_performance: 0 },
  "Kennidy Troupe": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 3, tardies: 1, ea_performance: 1, ua_performance: 0 },
  "Kiss Turner": { grade: "B", ea_rehearsal: 1, ua_rehearsal: 4, tardies: 1, ea_performance: 0, ua_performance: 0, dropped: true },
  "Kyerra Shields": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 0, tardies: 0, ea_performance: 2, ua_performance: 0 },
  "Lake Hawkins": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 0, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Lauryn White": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 0, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Madison Morgan": { grade: "F", ea_rehearsal: 17, ua_rehearsal: 8, tardies: 0, ea_performance: 2, ua_performance: 1, dropped: true },
  "Madisyn Washington": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Malia Walker": { grade: "D", ea_rehearsal: 8, ua_rehearsal: 3, tardies: 0, ea_performance: 1, ua_performance: 0 },
  "Mia Awai-Gibbs": { grade: "F", ea_rehearsal: 3, ua_rehearsal: 5, tardies: 2, ea_performance: 1, ua_performance: 1 },
  "Michelle Johnson": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 3, tardies: 3, ea_performance: 0, ua_performance: 0 },
  "Mikala Calhoun": { grade: "A", ea_rehearsal: 6, ua_rehearsal: 1, tardies: 7, ea_performance: 0, ua_performance: 0 },
  "Morgan Miller": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Mya Jones": { grade: "A", ea_rehearsal: 0, ua_rehearsal: 0, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Myah Crawford": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 0, tardies: 1, ea_performance: 2, ua_performance: 0 },
  "Nia Ragin": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Nzinga Jean": { grade: "F", ea_rehearsal: 6, ua_rehearsal: 7, tardies: 4, ea_performance: 2, ua_performance: 1 },
  "Olivia James": { grade: "A", ea_rehearsal: 8, ua_rehearsal: 1, tardies: 0, ea_performance: 1, ua_performance: 0 },
  "Onnesty Peele": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 0, tardies: 2, ea_performance: 0, ua_performance: 0 },
  "Phoenix King": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 0, tardies: 0, ea_performance: 1, ua_performance: 1 },
  "Rayne Stewart": { grade: "A", ea_rehearsal: 7, ua_rehearsal: 2, tardies: 3, ea_performance: 3, ua_performance: 0 },
  "Reagan McMichael": { grade: "D", ea_rehearsal: 1, ua_rehearsal: 4, tardies: 0, ea_performance: 0, ua_performance: 1 },
  "Reed Smith": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 0, tardies: 1, ea_performance: 1, ua_performance: 0 },
  "Ryan Bates": { grade: "A", ea_rehearsal: 7, ua_rehearsal: 0, tardies: 3, ea_performance: 0, ua_performance: 1 },
  "Ryan Ellis": { grade: "A", ea_rehearsal: 3, ua_rehearsal: 0, tardies: 2, ea_performance: 0, ua_performance: 0 },
  "Samarah Currie": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 0, tardies: 5, ea_performance: 1, ua_performance: 0 },
  "Samia Kirton": { grade: "A", ea_rehearsal: 1, ua_rehearsal: 0, tardies: 0, ea_performance: 2, ua_performance: 0 },
  "Samirah Mungin": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 0, tardies: 8, ea_performance: 2, ua_performance: 1 },
  "Sanaia Harrison": { grade: "A", ea_rehearsal: 2, ua_rehearsal: 0, tardies: 1, ea_performance: 0, ua_performance: 0 },
  "Sara Scherlinder": { grade: "B", ea_rehearsal: 8, ua_rehearsal: 2, tardies: 6, ea_performance: 3, ua_performance: 1 },
  "Shelby Nashe": { grade: "F", ea_rehearsal: 4, ua_rehearsal: 2, tardies: 13, ea_performance: 2, ua_performance: 0 },
  "Soleil Vailes": { grade: "A", ea_rehearsal: 1, ua_rehearsal: 2, tardies: 2, ea_performance: 0, ua_performance: 0 },
  "Tyara Petty": { grade: "A", ea_rehearsal: 4, ua_rehearsal: 3, tardies: 2, ea_performance: 1, ua_performance: 0 },
  "Taylor Wells": { grade: "B", ea_rehearsal: 3, ua_rehearsal: 3, tardies: 0, ea_performance: 0, ua_performance: 0 },
  "Tiyanna Dudley": { grade: "F", ea_rehearsal: 13, ua_rehearsal: 4, tardies: 0, ea_performance: 1, ua_performance: 0 },
  "Trennedy Wade": { grade: "A", ea_rehearsal: 16, ua_rehearsal: 2, tardies: 2, ea_performance: 3, ua_performance: 0 },
  "Wambui Kennedy": { grade: "C", ea_rehearsal: 1, ua_rehearsal: 1, tardies: 0, ea_performance: 0, ua_performance: 2 },
  "Yaa Opong": { grade: "A", ea_rehearsal: 5, ua_rehearsal: 1, tardies: 2, ea_performance: 1, ua_performance: 0 },
  "Yazmere Bose": { grade: "B", ea_rehearsal: 6, ua_rehearsal: 4, tardies: 1, ea_performance: 0, ua_performance: 0 },
  "Zoe Champion": { grade: "B", ea_rehearsal: 13, ua_rehearsal: 2, tardies: 0, ea_performance: 2, ua_performance: 1 },
};

interface StudentGradeRow {
  student_name: string;
  sectionals_pct: number;
  sight_singing_pct: number;
  performances_pct: number;
  ea_rehearsal: number;
  ua_rehearsal: number;
  tardies: number;
  ea_performance: number;
  ua_performance: number;
  effective_absences: number;
  raw_grade_pct: number;
  final_grade_pct: number;
  letter_grade: string;
  is_dropped: boolean;
}

type GradeField = 'sectionals_pct' | 'sight_singing_pct' | 'performances_pct';
type SortField = 'student_name' | GradeField | 'final_grade' | 'ua_rehearsal' | 'effective_absences';
type SortDirection = 'asc' | 'desc';

export const Mus070GradeSpreadsheet: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<GradeField, number>>>>({});
  const [sortField, setSortField] = useState<SortField>('student_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [canEditGrades, setCanEditGrades] = useState(false);

  // Check if user has permission to edit grades (admin, super_admin, or secretary)
  useEffect(() => {
    const checkEditPermission = async () => {
      if (!user) {
        setCanEditGrades(false);
        return;
      }
      
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, exec_board_role')
        .eq('user_id', user.id)
        .single();
      
      const hasPermission = 
        data?.is_admin || 
        data?.is_super_admin || 
        data?.exec_board_role === 'secretary';
      
      setCanEditGrades(hasPermission || false);
    };
    
    checkEditPermission();
  }, [user]);

  const handleOverride = (studentName: string, field: GradeField, value: number) => {
    const maxValues: Record<GradeField, number> = {
      sectionals_pct: GRADE_WEIGHTS.sectionals,
      sight_singing_pct: GRADE_WEIGHTS.sightSinging,
      performances_pct: GRADE_WEIGHTS.performances,
    };
    const clampedValue = Math.min(Math.max(0, value), maxValues[field]);
    
    setOverrides(prev => ({
      ...prev,
      [studentName]: {
        ...prev[studentName],
        [field]: clampedValue
      }
    }));
  };

  const getEffectiveValue = (student: StudentGradeRow, field: GradeField): number => {
    return overrides[student.student_name]?.[field] ?? student[field];
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

  // Build student data from official grades
  const students: StudentGradeRow[] = useMemo(() => {
    return Object.entries(OFFICIAL_GRADES).map(([name, data]) => {
      // Calculate effective absences for reference
      const excessTardies = Math.max(0, data.tardies - MAX_TARDIES_NO_PENALTY);
      const tardyAbsences = Math.floor(excessTardies / TARDIES_PER_ABSENCE);
      const performanceAbsences = data.ua_performance * 2;
      const effectiveAbsences = data.ua_rehearsal + tardyAbsences + performanceAbsences;

      const isDropped = data.dropped || false;

      // Use official letter grade from secretary
      const letterGrade = data.grade;
      
      // Derive approximate percentage from letter grade for display
      const gradeToPercent: Record<string, number> = {
        'A': 95, 'A-': 90, 'B+': 87, 'B': 83, 'B-': 80,
        'C+': 77, 'C': 73, 'C-': 70, 'D+': 65, 'D': 60, 'F': 50
      };
      const finalGrade = isDropped ? 0 : (gradeToPercent[letterGrade] || 0);

      return {
        student_name: name,
        sectionals_pct: GRADE_WEIGHTS.sectionals,
        sight_singing_pct: GRADE_WEIGHTS.sightSinging,
        performances_pct: isDropped ? 0 : GRADE_WEIGHTS.performances,
        ea_rehearsal: data.ea_rehearsal,
        ua_rehearsal: data.ua_rehearsal,
        tardies: data.tardies,
        ea_performance: data.ea_performance,
        ua_performance: data.ua_performance,
        effective_absences: effectiveAbsences,
        raw_grade_pct: 100,
        final_grade_pct: finalGrade,
        letter_grade: isDropped ? 'DROPPED' : letterGrade,
        is_dropped: isDropped,
      };
    });
  }, []);

  const exportToCSV = () => {
    const headers = ['Student Name', 'Sectionals (25%)', 'Sight Singing (25%)', 'Performances (50%)', 'UA Rehearsal', 'UA Performance', 'Tardies', 'Effective Absences', 'Final Grade (%)', 'Letter Grade', 'Status'];
    const rows = sortedAndFilteredStudents.map(s => [
      s.student_name,
      getEffectiveValue(s, 'sectionals_pct').toFixed(1),
      getEffectiveValue(s, 'sight_singing_pct').toFixed(1),
      getEffectiveValue(s, 'performances_pct').toFixed(1),
      s.ua_rehearsal,
      s.ua_performance,
      s.tardies,
      s.effective_absences,
      calculateFinalGrade(s).toFixed(1),
      getLetterGrade(calculateFinalGrade(s)),
      s.is_dropped ? 'DROPPED' : 'Active'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mus070_glee_club_grades_fall2025.csv';
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
      } else if (sortField === 'ua_rehearsal') {
        aVal = a.ua_rehearsal;
        bVal = b.ua_rehearsal;
      } else if (sortField === 'effective_absences') {
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              MUS 070 - Glee Club Grade Sheet
              {canEditGrades ? (
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Edit Mode</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground"><Lock className="h-3 w-3 mr-1" />View Only</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Fall 2025 • Per Glee Club Handbook grading policy
              {!canEditGrades && <span className="ml-2">(Only admins and secretary can edit grades)</span>}
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
            <strong>Attendance Policy:</strong> 3 unexcused absences allowed | Beyond 3 = grade drops 7% per absence | 
            6+ absences = dropped | Missing performance = 2 absences | 2 tardies (beyond 3) = 1 absence
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                  onClick={() => handleSort('ua_rehearsal')}
                >
                  <div className="flex items-center justify-center">
                    UA {getSortIcon('ua_rehearsal')}
                  </div>
                </TableHead>
                <TableHead className="text-center text-foreground">
                  Tardies
                </TableHead>
                <TableHead 
                  className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('effective_absences')}
                >
                  <div className="flex items-center justify-center">
                    Eff. Abs {getSortIcon('effective_absences')}
                  </div>
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
                  <TableRow key={student.student_name} className={student.is_dropped ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-medium text-foreground">
                      {student.student_name}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEditGrades ? (
                        <Input
                          type="number"
                          min="0"
                          max={GRADE_WEIGHTS.sectionals}
                          step="0.5"
                          value={getEffectiveValue(student, 'sectionals_pct')}
                          onChange={(e) => handleOverride(student.student_name, 'sectionals_pct', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center mx-auto h-8"
                          disabled={student.is_dropped}
                        />
                      ) : (
                        <span className="text-foreground">{getEffectiveValue(student, 'sectionals_pct').toFixed(1)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEditGrades ? (
                        <Input
                          type="number"
                          min="0"
                          max={GRADE_WEIGHTS.sightSinging}
                          step="0.5"
                          value={getEffectiveValue(student, 'sight_singing_pct')}
                          onChange={(e) => handleOverride(student.student_name, 'sight_singing_pct', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center mx-auto h-8"
                          disabled={student.is_dropped}
                        />
                      ) : (
                        <span className="text-foreground">{getEffectiveValue(student, 'sight_singing_pct').toFixed(1)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEditGrades ? (
                        <Input
                          type="number"
                          min="0"
                          max={GRADE_WEIGHTS.performances}
                          step="0.5"
                          value={getEffectiveValue(student, 'performances_pct')}
                          onChange={(e) => handleOverride(student.student_name, 'performances_pct', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center mx-auto h-8"
                          disabled={student.is_dropped}
                        />
                      ) : (
                        <span className="text-foreground">{getEffectiveValue(student, 'performances_pct').toFixed(1)}</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-center ${getAbsenceColor(student.ua_rehearsal + student.ua_performance * 2)}`}>
                      {student.ua_rehearsal}
                      {student.ua_performance > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">(+{student.ua_performance}P)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-foreground">
                      {student.tardies}
                    </TableCell>
                    <TableCell className={`text-center ${getAbsenceColor(student.effective_absences)}`}>
                      {student.effective_absences}
                      {student.effective_absences > MAX_ABSENCES_NO_PENALTY && (
                        <AlertTriangle className="h-3 w-3 inline ml-1" />
                      )}
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
        
        {/* Summary Stats */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
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
