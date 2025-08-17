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
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Sight Reading Studio</h1>
        <p className="text-muted-foreground">
          Practice sight reading, complete assignments, and track your progress through the semester.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Grade</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {semesterGrade?.letter_grade || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {semesterGrade?.current_grade ? `${semesterGrade.current_grade.toFixed(1)}%` : 'No grades yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              This semester
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">
              Due this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="assignments" className="space-x-2">
            <FileText className="h-4 w-4" />
            <span>Assignments</span>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {overdueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="practice" className="space-x-2">
            <Music className="h-4 w-4" />
            <span>Practice</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="space-x-2">
            <Headphones className="h-4 w-4" />
            <span>Resources</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="space-x-2">
            <Target className="h-4 w-4" />
            <span>Grades</span>
          </TabsTrigger>
          <TabsTrigger value="pitch-pipe" className="space-x-2">
            <Music className="h-4 w-4" />
            <span>Pitch Pipe</span>
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