import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  BookOpen,
  FileText,
  ClipboardCheck,
  Users,
  Calendar,
  TrendingUp,
  Award,
  Target,
  GraduationCap,
  ChevronDown,
  CheckCircle2,
  Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StudentGradeSummaryProps {
  studentId: string;
}

interface JournalGrade {
  id: string;
  assignment_id: string;
  instructor_score: number | null;
  overall_score: number | null;
  created_at: string;
  assignment_code?: string;
}

interface GradeBreakdown {
  journals: {
    earned: number;
    possible: number;
    count: number;
    graded: number;
    items: JournalGrade[];
  };
  aiGroupProject: {
    earned: number;
    possible: number;
    submitted: boolean;
  };
  midterm: {
    earned: number;
    possible: number;
    submitted: boolean;
  };
  finalEssay: {
    earned: number;
    possible: number;
    submitted: boolean;
  };
  finalExam: {
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
  current: {
    earned: number;
    possible: number;
    percentage: number;
    letterGrade: string;
  };
  projected: {
    earned: number;
    possible: number;
    percentage: number;
    letterGrade: string;
  };
}

export const StudentGradeSummary: React.FC<StudentGradeSummaryProps> = ({ studentId }) => {
  const [gradeData, setGradeData] = useState<GradeBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [journalsOpen, setJournalsOpen] = useState(false);

  useEffect(() => {
    fetchGradeBreakdown();
  }, [studentId]);

  const fetchGradeBreakdown = async () => {
    try {
      setLoading(true);

      // Fetch journal grades
      const { data: journalGrades, error: journalError } = await supabase
        .from('mus240_journal_grades')
        .select('id, assignment_id, instructor_score, overall_score, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (journalError) throw journalError;

      // Fetch all assignment submissions to identify types and grades
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId);

      if (assignmentsError) throw assignmentsError;

      // Fetch midterm
      const { data: midterm, error: midtermError } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (midtermError) throw midtermError;

      // Fetch final exam from gw_grades table
      const { data: finalExamAssignment, error: finalExamAssignmentError } = await supabase
        .from('gw_assignments')
        .select('id')
        .eq('title', 'Final Exam')
        .eq('course_id', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37')
        .maybeSingle();

      if (finalExamAssignmentError) throw finalExamAssignmentError;

      let finalExamData = null;
      if (finalExamAssignment) {
        const { data: finalExamGrade, error: finalExamGradeError } = await supabase
          .from('gw_grades')
          .select('*')
          .eq('student_id', studentId)
          .eq('assignment_id', finalExamAssignment.id)
          .maybeSingle();

        if (finalExamGradeError) throw finalExamGradeError;
        finalExamData = finalExamGrade;
      }

      // Fetch participation
      const { data: participation, error: participationError } = await supabase
        .from('mus240_participation_grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (participationError) throw participationError;

      // Fetch poll responses to calculate poll participation
      const { data: pollResponses, error: pollError } = await supabase
        .from('mus240_poll_responses')
        .select('poll_id')
        .eq('student_id', studentId);

      if (pollError) throw pollError;

      // Get total number of polls to calculate participation percentage
      const { data: allPolls, error: pollsError } = await supabase
        .from('mus240_polls')
        .select('id');

      if (pollsError) throw pollsError;

      // Fetch attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', studentId);

      if (attendanceError) throw attendanceError;

      // Calculate journal grades: 10 journals required at 20 points each = 200 points total
      const journalItems: JournalGrade[] = journalGrades?.map(g => ({
        id: g.id,
        assignment_id: g.assignment_id,
        instructor_score: g.instructor_score,
        overall_score: g.overall_score,
        created_at: g.created_at,
        assignment_code: undefined
      })) || [];

      // Sum the actual scores earned (each journal is 0-20 points)
      const journalPoints = journalItems.reduce((sum, g) => {
        const score = g.instructor_score !== null && g.instructor_score !== undefined
          ? g.instructor_score
          : g.overall_score;
        return sum + (score || 0);
      }, 0);
      
      const journalCount = journalItems.length;
      const journalPossible = 200; // 10 journals × 20 points each
      const journalGraded = journalItems.filter(g => 
        (g.instructor_score !== null && g.instructor_score !== undefined) ||
        (g.overall_score !== null && g.overall_score !== undefined)
      ).length;

      // Identify specific assignments by type (excluding journals)
      const nonJournalAssignments = assignmentsData?.filter(a => 
        !a.assignment_id?.toLowerCase().startsWith('lj') && 
        !a.assignment_id?.toLowerCase().includes('journal')
      ) || [];
      
      // Combine research project and AI project into one "AI Group Project" (250 points total)
      const researchProject = nonJournalAssignments.find(a => 
        a.assignment_id?.toLowerCase().includes('research') || 
        a.file_name?.toLowerCase().includes('research')
      );
      const aiProject = nonJournalAssignments.find(a => 
        a.assignment_id?.toLowerCase().includes('ai') || 
        a.file_name?.toLowerCase().includes('ai')
      );
      
      const finalEssay = nonJournalAssignments.find(a => 
        a.assignment_id?.toLowerCase().includes('final') || 
        a.assignment_id?.toLowerCase().includes('reflection') ||
        a.file_name?.toLowerCase().includes('final') ||
        a.file_name?.toLowerCase().includes('reflection')
      );

      // Calculate AI Group Project grade (combined research + AI = 250 points)
      const aiGroupPossible = 250;
      let aiGroupPoints = 0;
      let aiGroupSubmitted = false;
      
      // Add research project portion (150 points)
      if (researchProject?.grade !== null && researchProject?.grade !== undefined) {
        aiGroupPoints += (researchProject.grade / 100) * 150;
        aiGroupSubmitted = true;
      }
      
      // Add AI project portion (100 points)
      if (aiProject?.grade !== null && aiProject?.grade !== undefined) {
        aiGroupPoints += (aiProject.grade / 100) * 100;
        aiGroupSubmitted = true;
      }

      const finalEssayPossible = 50;
      const finalEssayPoints = finalEssay?.grade 
        ? (finalEssay.grade / 100) * finalEssayPossible 
        : 0;

      // Final Exam (100 points)
      const finalExamPossible = 100;
      const finalExamPoints = finalExamData?.points_earned || 0;

      // Midterm (100 points per policy)
      const midtermPossible = 100;
      const midtermPoints = midterm?.grade 
        ? (midterm.grade / 90) * midtermPossible 
        : 0;

      // Participation & Discussion: Combine participation + poll participation (50 points total)
      const participationPossible = 50;
      const baseParticipationPoints = participation?.points_earned || 0;
      const basePossible = participation?.points_possible || 75;
      
      // Calculate poll participation: count unique polls responded to
      const uniquePollsResponded = new Set(pollResponses?.map(r => r.poll_id) || []).size;
      const totalPolls = allPolls?.length || 0;
      const pollParticipationRate = totalPolls > 0 ? uniquePollsResponded / totalPolls : 0;
      
      // Weight: 70% base participation, 30% poll participation
      const participationWeight = 0.7;
      const pollWeight = 0.3;
      
      const normalizedBaseParticipation = basePossible > 0 ? (baseParticipationPoints / basePossible) : 0;
      const participationPoints = (
        (normalizedBaseParticipation * participationWeight) + 
        (pollParticipationRate * pollWeight)
      ) * participationPossible;

      // Calculate current grade (only completed work)
      let currentEarned = 0;
      let currentPossible = 0;

      // Add journals if any are graded (only count graded journals' possible points)
      if (journalGraded > 0) {
        currentEarned += journalPoints;
        currentPossible += journalGraded * 20; // Each journal is worth 20 points
      }

      // Add AI Group Project if graded
      if (aiGroupSubmitted) {
        currentEarned += aiGroupPoints;
        currentPossible += aiGroupPossible;
      }

      // Add midterm if graded
      if (midterm?.grade) {
        currentEarned += midtermPoints;
        currentPossible += midtermPossible;
      }

      // Add final essay if graded
      if (finalEssay?.grade !== null && finalEssay?.grade !== undefined) {
        currentEarned += finalEssayPoints;
        currentPossible += finalEssayPossible;
      }

      // Add final exam if graded
      if (finalExamData?.points_earned) {
        currentEarned += finalExamPoints;
        currentPossible += finalExamPossible;
      }

      // Always add participation
      currentEarned += participationPoints;
      currentPossible += participationPossible;

      const currentPercentage = currentPossible > 0 ? (currentEarned / currentPossible) * 100 : 0;
      const currentLetterGrade = getLetterGrade(currentPercentage);

      // Calculate projected final grade (assume 100% on remaining work)
      const projectedEarned = currentEarned + 
        (journalGraded === 0 ? journalPossible : 0) +
        (!aiGroupSubmitted ? aiGroupPossible : 0) +
        (!midterm?.grade ? midtermPossible : 0) +
        (!finalEssay?.grade ? finalEssayPossible : 0) +
        (!finalExamData?.points_earned ? finalExamPossible : 0);
      
      const projectedPossible = 700; // Total points: 200 journals + 250 AI + 100 midterm + 50 essay + 100 final exam
      const projectedPercentage = (projectedEarned / projectedPossible) * 100;
      const projectedLetterGrade = getLetterGrade(projectedPercentage);

      const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
      const totalAttendance = attendance?.length || 0;

      setGradeData({
        journals: {
          earned: journalPoints,
          possible: journalPossible,
          count: journalCount,
          graded: journalGraded,
          items: journalItems
        },
        aiGroupProject: {
          earned: aiGroupPoints,
          possible: aiGroupPossible,
          submitted: aiGroupSubmitted
        },
        midterm: {
          earned: midtermPoints,
          possible: midtermPossible,
          submitted: !!midterm?.is_submitted
        },
        finalEssay: {
          earned: finalEssayPoints,
          possible: finalEssayPossible,
          submitted: !!finalEssay
        },
        finalExam: {
          earned: finalExamPoints,
          possible: finalExamPossible,
          submitted: !!finalExamData
        },
        participation: {
          earned: participationPoints,
          possible: participationPossible
        },
        attendance: {
          present: presentCount,
          total: totalAttendance
        },
        current: {
          earned: currentEarned,
          possible: currentPossible,
          percentage: currentPercentage,
          letterGrade: currentLetterGrade
        },
        projected: {
          earned: projectedEarned,
          possible: projectedPossible,
          percentage: projectedPercentage,
          letterGrade: projectedLetterGrade
        }
      });
    } catch (error) {
      console.error('Error fetching grade breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (percentage < 59) return 'F';
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
      title: 'Listening Journals',
      earned: gradeData.journals.earned,
      possible: gradeData.journals.possible,
      meta: `${gradeData.journals.graded} of ${gradeData.journals.count} graded`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hasDetail: true
    },
    {
      icon: Brain,
      title: 'AI Group Project',
      earned: gradeData.aiGroupProject.earned,
      possible: gradeData.aiGroupProject.possible,
      meta: gradeData.aiGroupProject.submitted ? 'Submitted' : 'Not submitted',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      hasDetail: false
    },
    {
      icon: ClipboardCheck,
      title: 'Midterm Exam',
      earned: gradeData.midterm.earned,
      possible: gradeData.midterm.possible,
      meta: gradeData.midterm.submitted ? 'Submitted' : 'Not submitted',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hasDetail: false
    },
    {
      icon: Award,
      title: 'Final Reflection Essay',
      earned: gradeData.finalEssay.earned,
      possible: gradeData.finalEssay.possible,
      meta: gradeData.finalEssay.submitted ? 'Submitted' : 'Not submitted',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      hasDetail: false
    },
    {
      icon: GraduationCap,
      title: 'Final Exam',
      earned: gradeData.finalExam.earned,
      possible: gradeData.finalExam.possible,
      meta: gradeData.finalExam.submitted ? 'Submitted' : 'Not submitted',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hasDetail: false
    },
    {
      icon: Users,
      title: 'Participation & Discussion',
      earned: gradeData.participation.earned,
      possible: gradeData.participation.possible,
      meta: 'Class engagement + poll participation',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hasDetail: false
    }
  ];

  return (
    <div className="space-y-4">
      {/* Current Grade Card */}
      <Card className={`border-2 ${getGradeBgColor(gradeData.current.percentage)} shadow-lg`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-background rounded-full">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Current Grade
                </h3>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className={`text-5xl font-bold ${getGradeColor(gradeData.current.percentage)}`}>
                    {gradeData.current.letterGrade}
                  </span>
                  <span className="text-2xl font-semibold text-foreground">
                    {gradeData.current.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {gradeData.current.earned.toFixed(1)} / {gradeData.current.possible} points earned
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2 mb-2">
                <Target className="h-4 w-4 mr-2" />
                Current Standing
              </Badge>
            </div>
          </div>
          <Progress 
            value={gradeData.current.percentage} 
            className="h-3"
          />
        </CardContent>
      </Card>

      {/* Projected Final Grade Card */}
      <Card className={`border-2 ${getGradeBgColor(gradeData.projected.percentage)} shadow-lg`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-background rounded-full">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Projected Final Grade
                </h3>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className={`text-5xl font-bold ${getGradeColor(gradeData.projected.percentage)}`}>
                    {gradeData.projected.letterGrade}
                  </span>
                  <span className="text-2xl font-semibold text-foreground">
                    {gradeData.projected.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {gradeData.projected.earned.toFixed(1)} / {gradeData.projected.possible} total points (if 100% on remaining)
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2 bg-primary/5">
                <TrendingUp className="h-4 w-4 mr-2" />
                Projection
              </Badge>
            </div>
          </div>
          <Progress 
            value={gradeData.projected.percentage} 
            className="h-3"
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
                      {item.earned.toFixed(1)}
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

                {/* Journal Detail Breakdown */}
                {item.hasDetail && gradeData.journals.items.length > 0 && (
                  <Collapsible open={journalsOpen} onOpenChange={setJournalsOpen} className="mt-3">
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
                      <ChevronDown className={`h-4 w-4 transition-transform ${journalsOpen ? 'rotate-180' : ''}`} />
                      View all {gradeData.journals.count} journals
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-2">
                      {gradeData.journals.items.map((journal, idx) => {
                        const score = journal.instructor_score !== null ? journal.instructor_score : journal.overall_score;
                        return (
                          <div key={journal.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                            <div className="flex items-center gap-2">
                              {score !== null && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                              <span className="text-muted-foreground">
                                {journal.assignment_code || `Journal ${idx + 1}`}
                              </span>
                            </div>
                            <span className="font-medium">
                              {score !== null ? score.toFixed(0) : 'Not graded'}
                            </span>
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
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

      {/* Grading Policies Reference */}
      <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5" />
            Grading Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left p-4 font-semibold">Category</th>
                  <th className="text-left p-4 font-semibold">Points</th>
                  <th className="text-left p-4 font-semibold">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/30">
                  <td className="p-4">Listening Journals (10 × 20 pts)</td>
                  <td className="p-4">200</td>
                  <td className="p-4">33%</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4">AI Group Project</td>
                  <td className="p-4">250</td>
                  <td className="p-4">42%</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4">Midterm Exam</td>
                  <td className="p-4">100</td>
                  <td className="p-4">17%</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4">Final Reflection Essay</td>
                  <td className="p-4">50</td>
                  <td className="p-4">7%</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4">Final Exam</td>
                  <td className="p-4">100</td>
                  <td className="p-4">14%</td>
                </tr>
                <tr className="bg-primary text-primary-foreground font-bold">
                  <td className="p-4">Total</td>
                  <td className="p-4">700</td>
                  <td className="p-4">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grading Scale Reference */}
      <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold uppercase tracking-wide">
            Grading Scale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">A</span> = 95–100%
              </div>
              <div className="text-sm">
                <span className="font-semibold">B-</span> = 80–82%
              </div>
              <div className="text-sm">
                <span className="font-semibold">D+</span> = 65–69%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">A-</span> = 90–94%
              </div>
              <div className="text-sm">
                <span className="font-semibold">C+</span> = 77–79%
              </div>
              <div className="text-sm">
                <span className="font-semibold">D</span> = 60–64%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">B+</span> = 87–89%
              </div>
              <div className="text-sm">
                <span className="font-semibold">C</span> = 73–76%
              </div>
              <div className="text-sm">
                <span className="font-semibold">F</span> = &lt;59%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">B</span> = 83–86%
              </div>
              <div className="text-sm">
                <span className="font-semibold">C-</span> = 70–72%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
