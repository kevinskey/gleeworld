import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  FileText,
  ClipboardCheck,
  Users,
  Calendar,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StudentGradeSummaryProps {
  studentId: string;
}

interface GradeBreakdown {
  journals: {
    earned: number;
    possible: number;
    count: number;
    graded: number;
  };
  assignments: {
    earned: number;
    possible: number;
    count: number;
    graded: number;
  };
  midterm: {
    earned: number;
    possible: number;
    submitted: boolean;
  };
  participation: {
    earned: number;
    possible: number;
  };
  attendance: {
    present: number;
    total: number;
  };
  overall: {
    earned: number;
    possible: number;
    percentage: number;
    letterGrade: string;
  };
}

export const StudentGradeSummary: React.FC<StudentGradeSummaryProps> = ({ studentId }) => {
  const [gradeData, setGradeData] = useState<GradeBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGradeBreakdown();
  }, [studentId]);

  const fetchGradeBreakdown = async () => {
    try {
      setLoading(true);

      // Fetch journal entries count
      const { data: journalsData, error: journalsError } = await (supabase as any)
        .from('mus240_journal_entries')
        .select('id')
        .eq('user_id', studentId);

      if (journalsError) throw journalsError;

      // Fetch journal grades (using instructor_score which overrides overall_score when available)
      const { data: gradesData, error: gradesError } = await (supabase as any)
        .from('mus240_journal_grades')
        .select('id, student_id, instructor_score, overall_score, journal_id')
        .eq('student_id', studentId);

      if (gradesError) throw gradesError;

      // Fetch assignment submissions
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId);

      if (assignmentsError) throw assignmentsError;

      // Fetch midterm submission
      const { data: midterm, error: midtermError } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (midtermError) throw midtermError;

      // Fetch participation grade
      const { data: participation, error: participationError } = await supabase
        .from('mus240_participation_grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (participationError) throw participationError;

      // Fetch attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', studentId);

      if (attendanceError) throw attendanceError;

      // Calculate breakdown
      // For journals, use instructor_score if available, otherwise overall_score
      const gradedJournals = gradesData || [];
      const journalPoints = gradedJournals.reduce((sum, g) => {
        const score = g.instructor_score !== null ? g.instructor_score : g.overall_score;
        return sum + (score || 0);
      }, 0);
      const journalPossible = gradedJournals.length * 100; // Assuming 100 points per journal

      const assignmentPoints = assignments?.reduce((sum, a) => sum + (a.grade || 0), 0) || 0;
      const gradedAssignments = assignments?.filter(a => a.grade !== null && a.grade !== undefined) || [];
      const assignmentPossible = gradedAssignments.length * 100;

      const midtermPoints = midterm?.grade || 0;
      const midtermPossible = 90; // From syllabus

      const participationPoints = participation?.points_earned || 0;
      const participationPossible = participation?.points_possible || 75;

      const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
      const totalAttendance = attendance?.length || 0;

      const totalEarned = journalPoints + assignmentPoints + midtermPoints + participationPoints;
      const totalPossible = journalPossible + assignmentPossible + midtermPossible + participationPossible;
      const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

      const letterGrade = getLetterGrade(percentage);

      setGradeData({
        journals: {
          earned: journalPoints,
          possible: journalPossible,
          count: journalsData?.length || 0,
          graded: gradedJournals.length
        },
        assignments: {
          earned: assignmentPoints,
          possible: assignmentPossible,
          count: assignments?.length || 0,
          graded: gradedAssignments.length
        },
        midterm: {
          earned: midtermPoints,
          possible: midtermPossible,
          submitted: !!midterm?.is_submitted
        },
        participation: {
          earned: participationPoints,
          possible: participationPossible
        },
        attendance: {
          present: presentCount,
          total: totalAttendance
        },
        overall: {
          earned: totalEarned,
          possible: totalPossible,
          percentage,
          letterGrade
        }
      });
    } catch (error) {
      console.error('Error fetching grade breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-50 border-emerald-200';
    if (percentage >= 80) return 'bg-blue-50 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200';
    if (percentage >= 60) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading grade summary...</div>
        </CardContent>
      </Card>
    );
  }

  if (!gradeData) {
    return null;
  }

  const categoryItems = [
    {
      icon: BookOpen,
      title: 'Journal Entries',
      earned: gradeData.journals.earned,
      possible: gradeData.journals.possible,
      meta: `${gradeData.journals.graded} of ${gradeData.journals.count} graded`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: FileText,
      title: 'Assignments',
      earned: gradeData.assignments.earned,
      possible: gradeData.assignments.possible,
      meta: `${gradeData.assignments.graded} of ${gradeData.assignments.count} graded`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: ClipboardCheck,
      title: 'Midterm Exam',
      earned: gradeData.midterm.earned,
      possible: gradeData.midterm.possible,
      meta: gradeData.midterm.submitted ? 'Submitted' : 'Not submitted',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Users,
      title: 'Participation',
      earned: gradeData.participation.earned,
      possible: gradeData.participation.possible,
      meta: 'Class engagement',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Overall Grade Card */}
      <Card className={`border-2 ${getGradeBgColor(gradeData.overall.percentage)} shadow-lg`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-background rounded-full">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Overall Grade
                </h3>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className={`text-5xl font-bold ${getGradeColor(gradeData.overall.percentage)}`}>
                    {gradeData.overall.letterGrade}
                  </span>
                  <span className="text-2xl font-semibold text-foreground">
                    {gradeData.overall.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {gradeData.overall.earned.toFixed(0)} / {gradeData.overall.possible} points
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Target className="h-4 w-4 mr-2" />
                Current Standing
              </Badge>
            </div>
          </div>
          <Progress 
            value={gradeData.overall.percentage} 
            className="h-3 mt-4"
          />
        </CardContent>
      </Card>

      {/* Grade Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryItems.map((item, index) => {
          const percentage = item.possible > 0 ? (item.earned / item.possible) * 100 : 0;
          
          return (
            <Card key={index} className="border-0 bg-card/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${item.bgColor} rounded-lg`}>
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.meta}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                      {item.earned.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      / {item.possible}
                    </div>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
                <div className="mt-2 text-right">
                  <span className="text-sm font-medium text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Attendance Card */}
      <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Calendar className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Attendance</h4>
                <p className="text-xs text-muted-foreground">Class participation</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {gradeData.attendance.present}
              </div>
              <div className="text-xs text-muted-foreground">
                / {gradeData.attendance.total} classes
              </div>
            </div>
          </div>
          <Progress 
            value={gradeData.attendance.total > 0 ? (gradeData.attendance.present / gradeData.attendance.total) * 100 : 0} 
            className="h-2 mt-3"
          />
          <div className="mt-2 text-right">
            <span className="text-sm font-medium text-muted-foreground">
              {gradeData.attendance.total > 0 
                ? ((gradeData.attendance.present / gradeData.attendance.total) * 100).toFixed(1) 
                : 0}% attendance
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
