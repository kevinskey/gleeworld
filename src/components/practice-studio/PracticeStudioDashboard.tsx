import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Mic, 
  Clock, 
  Award, 
  Calendar,
  FileMusic,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useAssignments } from '@/hooks/useAssignments';
import { AssignmentViewer } from './AssignmentViewer';
import { RecordingStudio } from './RecordingStudio';

interface PracticeStudioDashboardProps {
  user: any;
}

export const PracticeStudioDashboard: React.FC<PracticeStudioDashboardProps> = ({ user }) => {
  const { 
    assignments, 
    submissions, 
    loading, 
    getSubmissionForAssignment,
    getOverdueAssignments,
    getUpcomingAssignments 
  } = useAssignments();
  
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [activeView, setActiveView] = useState<'assignments' | 'practice' | 'record'>('assignments');

  const overdueAssignments = getOverdueAssignments();
  const upcomingAssignments = getUpcomingAssignments(7); // Due within 7 days

  const getAssignmentStatus = (assignment: any) => {
    const submission = getSubmissionForAssignment(assignment.id);
    if (!submission) return 'not_started';
    if (submission.status === 'graded') return 'completed';
    if (submission.status === 'submitted') return 'submitted';
    return 'in_progress';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <FileMusic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Active sight-reading assignments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueAssignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Assignments past due date
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{upcomingAssignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Due within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <FileMusic className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="practice" className="flex items-center gap-2" disabled={!selectedAssignment}>
            <Eye className="h-4 w-4" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="record" className="flex items-center gap-2" disabled={!selectedAssignment}>
            <Mic className="h-4 w-4" />
            Record
          </TabsTrigger>
        </TabsList>

        {/* Assignments List */}
        <TabsContent value="assignments" className="space-y-4">
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground">No Assignments</h3>
                      <p className="text-sm text-muted-foreground">
                        You don't have any sight-reading assignments yet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                assignments.map((assignment) => {
                  const status = getAssignmentStatus(assignment);
                  const submission = getSubmissionForAssignment(assignment.id);
                  const isOverdue = new Date(assignment.due_date) < new Date() && status !== 'completed';
                  
                  return (
                    <Card 
                      key={assignment.id} 
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedAssignment?.id === assignment.id ? 'ring-2 ring-primary' : ''
                      } ${isOverdue ? 'border-red-200 dark:border-red-800' : ''}`}
                      onClick={() => setSelectedAssignment(assignment)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{assignment.title}</h3>
                              <Badge className={getStatusColor(status)}>
                                {getStatusIcon(status)}
                                <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {assignment.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                              {assignment.sheet_music?.title && (
                                <span className="flex items-center gap-1">
                                  <FileMusic className="h-3 w-3" />
                                  {assignment.sheet_music.title}
                                </span>
                              )}
                            </div>
                            
                            {submission && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {submission.grade && (
                                  <span className="flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    Grade: {submission.grade}%
                                  </span>
                                )}
                                <span>
                                  Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssignment(assignment);
                              setActiveView('practice');
                            }}
                          >
                            {status === 'not_started' ? 'Start' : 'Continue'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Practice View */}
        <TabsContent value="practice" className="space-y-4">
          {selectedAssignment ? (
            <AssignmentViewer 
              assignment={selectedAssignment}
              onStartRecording={() => setActiveView('record')}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No Assignment Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select an assignment from the list to practice.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recording Studio */}
        <TabsContent value="record" className="space-y-4">
          {selectedAssignment ? (
            <RecordingStudio 
              assignment={selectedAssignment}
              onSubmissionComplete={() => setActiveView('assignments')}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No Assignment Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select an assignment to record your performance.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};