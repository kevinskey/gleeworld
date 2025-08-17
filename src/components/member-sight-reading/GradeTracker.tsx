import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Award,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { useSemesterGrades } from '@/hooks/useSemesterGrades';
import { useAssignments } from '@/hooks/useAssignments';

interface GradeTrackerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const GradeTracker: React.FC<GradeTrackerProps> = ({ user }) => {
  const { semesterGrade, getWeeklyGrades, getGradeColor } = useSemesterGrades();
  const { assignments, submissions } = useAssignments();

  const weeklyGrades = getWeeklyGrades();
  const completedAssignments = submissions.filter(s => s.status === 'graded').length;
  const totalAssignments = assignments.length;
  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  const getWeekStatus = (points: number) => {
    if (points === 0) return 'incomplete';
    if (points >= 90) return 'excellent';
    if (points >= 80) return 'good';
    if (points >= 70) return 'satisfactory';
    return 'needs-improvement';
  };

  const getWeekStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-emerald-500';
      case 'good':
        return 'bg-blue-500';
      case 'satisfactory':
        return 'bg-yellow-500';
      case 'needs-improvement':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  const getWeekStatusText = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'satisfactory':
        return 'Satisfactory';
      case 'needs-improvement':
        return 'Needs Improvement';
      default:
        return 'Incomplete';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Grade Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Grade</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {semesterGrade?.letter_grade || 'N/A'}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`text-lg font-medium ${getGradeColor(semesterGrade?.current_grade || 0)}`}>
                {semesterGrade?.current_grade ? `${semesterGrade.current_grade.toFixed(1)}%` : '0%'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {semesterGrade?.total_points_earned || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {semesterGrade?.total_points_possible || 0} possible
            </p>
            <Progress 
              value={semesterGrade?.total_points_possible ? 
                (semesterGrade.total_points_earned / semesterGrade.total_points_possible) * 100 : 0
              } 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {completedAssignments} of {totalAssignments} assignments
            </p>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Weekly Progress</span>
          </CardTitle>
          <CardDescription>
            Track your progress throughout the 13-week semester.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Week status legend */}
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Excellent (90%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Good (80-89%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Satisfactory (70-79%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Needs Improvement (&lt;70%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-muted"></div>
                <span>Incomplete</span>
              </div>
            </div>

            {/* Weekly grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-13 gap-3">
              {weeklyGrades.map((week, index) => {
                const status = getWeekStatus(week.points);
                return (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                  >
                    <div
                      className={`
                        w-full h-16 rounded-lg border-2 border-transparent
                        ${getWeekStatusColor(status)}
                        hover:border-primary/50 transition-colors
                        flex flex-col items-center justify-center text-white text-xs font-medium
                      `}
                    >
                      <div className="text-xs">{week.week.split(' ')[1]}</div>
                      <div className="text-sm font-bold">
                        {week.points > 0 ? `${week.points.toFixed(0)}%` : '-'}
                      </div>
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                      <div className="font-medium">{week.week}</div>
                      <div>{week.points > 0 ? `${week.points.toFixed(1)}%` : 'No assignments'}</div>
                      <div className="text-muted-foreground">{getWeekStatusText(status)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Assignment Breakdown</span>
          </CardTitle>
          <CardDescription>
            Detailed view of your graded assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.filter(s => s.status === 'graded').length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Graded Assignments</h3>
              <p className="text-muted-foreground">
                Complete some assignments to see your grade breakdown here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions
                .filter(s => s.status === 'graded' && s.score_value)
                .map((submission) => {
                  const assignment = assignments.find(a => a.id === submission.assignment_id);
                  const percentage = submission.score_value || 0;
                  const letterGrade = percentage >= 97 ? 'A+' :
                    percentage >= 93 ? 'A' :
                    percentage >= 90 ? 'A-' :
                    percentage >= 87 ? 'B+' :
                    percentage >= 83 ? 'B' :
                    percentage >= 80 ? 'B-' :
                    percentage >= 77 ? 'C+' :
                    percentage >= 73 ? 'C' :
                    percentage >= 70 ? 'C-' :
                    percentage >= 67 ? 'D+' :
                    percentage >= 63 ? 'D' :
                    percentage >= 60 ? 'D-' : 'F';

                  return (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{assignment?.title || 'Assignment'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {assignment?.assignment_type.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-medium">{percentage.toFixed(1)}%</div>
                          <Badge 
                            variant="outline" 
                            className={getGradeColor(percentage)}
                          >
                            {letterGrade}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};