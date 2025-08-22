import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Music, FileText, Headphones, Target } from 'lucide-react';
import { AssignmentsList } from './AssignmentsList';
import { PracticeStudio } from './PracticeStudio';
import { GradeTracker } from './GradeTracker';
import { ResourceLibrary } from './ResourceLibrary';
import { PitchPipe } from '../sight-singing/PitchPipe';
import { useAssignments } from '@/hooks/useAssignments';
import { useSemesterGrades } from '@/hooks/useSemesterGrades';

interface MemberSightReadingStudioProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const MemberSightReadingStudio: React.FC<MemberSightReadingStudioProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('assignments');
  const { assignments, getOverdueAssignments, getUpcomingAssignments } = useAssignments();
  const { semesterGrade } = useSemesterGrades();

  const overdueCount = getOverdueAssignments().length;
  const upcomingCount = getUpcomingAssignments().length;
  const totalAssignments = assignments.length;

  return (
    <div className="container max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sight Reading Studio</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Practice sight reading, complete assignments, and track your progress through the semester.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Current Grade</CardTitle>
            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {semesterGrade?.letter_grade || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {semesterGrade?.current_grade ? `${semesterGrade.current_grade.toFixed(1)}%` : 'No grades yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Assignments</CardTitle>
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              This semester
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">
              Due this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="assignments" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <FileText className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Assignments</span>
            <span className="xs:hidden">Assign</span>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center">
                {overdueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="practice" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Music className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Practice</span>
            <span className="xs:hidden">Prac</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Headphones className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Resources</span>
            <span className="xs:hidden">Res</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Target className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Grades</span>
            <span className="xs:hidden">Grade</span>
          </TabsTrigger>
          <TabsTrigger value="pitch-pipe" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Music className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Pitch Pipe</span>
            <span className="xs:hidden">Pitch</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">
          <AssignmentsList user={user} />
        </TabsContent>

        <TabsContent value="practice" className="space-y-6">
          <PracticeStudio user={user} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <ResourceLibrary user={user} />
        </TabsContent>

        <TabsContent value="grades" className="space-y-6">
          <GradeTracker user={user} />
        </TabsContent>

        <TabsContent value="pitch-pipe" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pitch Pipe</CardTitle>
              <CardDescription>
                Use this virtual pitch pipe to find your starting pitch for sight reading exercises.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PitchPipe />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};