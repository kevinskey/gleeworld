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
    <div className="w-full page-container">
      {/* Header */}
      <div className="section-spacing">
        <h1 className="page-title-large">Sight Reading Studio</h1>
        <p className="mobile-text-lg text-muted-foreground">
          Practice sight reading, complete assignments, and track your progress through the semester.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="responsive-grid-4">
        <Card>
          <CardHeader className="card-header-compact flex flex-row items-center justify-between space-y-0">
            <CardTitle className="mobile-text-lg font-medium">Current Grade</CardTitle>
            <Target className="touch-target h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="card-compact">
            <div className="mobile-text-2xl font-bold">
              {semesterGrade?.letter_grade || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {semesterGrade?.current_grade ? `${semesterGrade.current_grade.toFixed(1)}%` : 'No grades yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="card-header-compact flex flex-row items-center justify-between space-y-0">
            <CardTitle className="mobile-text-lg font-medium">Total Assignments</CardTitle>
            <FileText className="touch-target h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="card-compact">
            <div className="mobile-text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="card-header-compact flex flex-row items-center justify-between space-y-0">
            <CardTitle className="mobile-text-lg font-medium">Upcoming</CardTitle>
            <Calendar className="touch-target h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="card-compact">
            <div className="mobile-text-2xl font-bold text-blue-600">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">Due this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="card-header-compact flex flex-row items-center justify-between space-y-0">
            <CardTitle className="mobile-text-lg font-medium">Overdue</CardTitle>
            <Calendar className="touch-target h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="card-compact">
            <div className="mobile-text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="section-spacing">
        <TabsList className="responsive-grid-2 md:grid-cols-5 gap-0.5 md:gap-1 h-auto p-1">
          <TabsTrigger value="assignments" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <FileText className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Assignments</span>
            <span className="xs:hidden">Assign</span>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs touch-target">
                {overdueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="practice" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <Music className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Practice</span>
            <span className="xs:hidden">Prac</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <Headphones className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Resources</span>
            <span className="xs:hidden">Res</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <Target className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Grades</span>
            <span className="xs:hidden">Grade</span>
          </TabsTrigger>
          <TabsTrigger value="pitch-pipe" className="dropdown-item-compact flex items-center gap-1 md:gap-2">
            <Music className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Pitch Pipe</span>
            <span className="xs:hidden">Pitch</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="section-spacing">
          <AssignmentsList user={user} />
        </TabsContent>

        <TabsContent value="practice" className="section-spacing">
          <PracticeStudio user={user} />
        </TabsContent>

        <TabsContent value="resources" className="section-spacing">
          <ResourceLibrary user={user} />
        </TabsContent>

        <TabsContent value="grades" className="section-spacing">
          <GradeTracker user={user} />
        </TabsContent>

        <TabsContent value="pitch-pipe" className="section-spacing">
          <Card>
            <CardHeader className="card-header-compact">
              <CardTitle className="page-header">Pitch Pipe</CardTitle>
              <CardDescription className="mobile-text-lg">
                Use this virtual pitch pipe to find your starting pitch for sight reading exercises.
              </CardDescription>
            </CardHeader>
            <CardContent className="card-compact">
              <PitchPipe />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};