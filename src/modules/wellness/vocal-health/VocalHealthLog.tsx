import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { useAssignments } from '@/hooks/useAssignments';
import { 
  Music, 
  Calendar as CalendarIcon,
  FileText,
  Target,
  Clock,
  CheckCircle
} from 'lucide-react';


const getStatusColor = (status: string) => {
  switch (status) {
    case 'submitted': return 'bg-blue-100 text-blue-800';
    case 'graded': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'sight_reading': return 'bg-purple-100 text-purple-800';
    case 'practice_exercise': return 'bg-blue-100 text-blue-800';
    case 'section_notes': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const VocalHealthLog = () => {
  const [activeTab, setActiveTab] = useState('assignments');
  const { assignments, getOverdueAssignments, getUpcomingAssignments, loading, submissions, getSubmissionForAssignment } = useAssignments();

  const overdueCount = getOverdueAssignments().length;
  const upcomingCount = getUpcomingAssignments().length;
  const completedCount = assignments.filter(a => {
    const submission = getSubmissionForAssignment(a.id);
    return submission !== null;
  }).length;

  const getAssignmentStatus = (assignment: any) => {
    const submission = getSubmissionForAssignment(assignment.id);
    if (!submission) return 'pending';
    if (submission.score_value !== null) return 'graded';
    return 'submitted';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold whitespace-nowrap overflow-hidden text-ellipsis">Sight-Singing Assignments</h2>
        </div>
      </div>
      
      <p className="text-muted-foreground">Complete assignments, practice sight reading, and track your progress</p>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{overdueCount}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{upcomingCount}</div>
                <div className="text-sm text-muted-foreground">Upcoming</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Assignments
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {overdueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="practice" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Practice Studio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">Loading assignments...</div>
              ) : (
                <div className="space-y-3">
                  {assignments.length > 0 ? (
                    assignments.map((assignment) => {
                      const submission = getSubmissionForAssignment(assignment.id);
                      const status = getAssignmentStatus(assignment);
                      
                      return (
                        <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Music className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{assignment.title}</div>
                              <div className="text-sm text-muted-foreground">
                                Due: {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getTypeColor(assignment.assignment_type)}>
                              {assignment.assignment_type.replace('_', ' ')}
                            </Badge>
                            <Badge className={getStatusColor(status)}>
                              {status}
                            </Badge>
                            {submission?.score_value && (
                              <Badge variant="outline">
                                {submission.score_value}%
                              </Badge>
                            )}
                            <Button size="sm" variant="outline">
                              <Target className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No assignments yet. Check back later!
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practice" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Practice Studio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 space-y-4">
                <Music className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Practice Studio</h3>
                <p className="text-muted-foreground">
                  Use the practice studio to work on sight-singing exercises and improve your skills.
                </p>
                <Button className="mt-4">
                  <Music className="h-4 w-4 mr-2" />
                  Open Practice Studio
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};