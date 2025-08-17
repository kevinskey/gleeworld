import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Music, 
  FileText, 
  Headphones, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { useAssignments } from '@/hooks/useAssignments';
import { AssignmentSubmissionDialog } from './AssignmentSubmissionDialog';

interface AssignmentsListProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const AssignmentsList: React.FC<AssignmentsListProps> = ({ user }) => {
  const { 
    assignments, 
    loading, 
    getSubmissionForAssignment, 
    getOverdueAssignments, 
    getUpcomingAssignments 
  } = useAssignments();
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

  const getStatusBadge = (assignment: any) => {
    const submission = getSubmissionForAssignment(assignment.id);
    const dueDate = new Date(assignment.due_date);
    const now = new Date();

    if (submission) {
      switch (submission.status) {
        case 'submitted':
          return <Badge variant="outline" className="text-green-600 border-green-600">Submitted</Badge>;
        case 'graded':
          return <Badge variant="outline" className="text-blue-600 border-blue-600">Graded</Badge>;
        case 'in_progress':
          return <Badge variant="outline" className="text-yellow-600 border-yellow-600">In Progress</Badge>;
        default:
          break;
      }
    }

    if (dueDate < now) {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 3) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Due Soon</Badge>;
    }

    return <Badge variant="outline">Assigned</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sight_reading':
        return <Music className="h-4 w-4" />;
      case 'practice_exercise':
        return <Play className="h-4 w-4" />;
      case 'section_notes':
        return <FileText className="h-4 w-4" />;
      case 'pdf_resource':
        return <Download className="h-4 w-4" />;
      case 'audio_resource':
        return <Headphones className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleStartAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    setSubmissionDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const overdueAssignments = getOverdueAssignments();
  const upcomingAssignments = getUpcomingAssignments();
  const allAssignments = assignments;

  const renderAssignmentCard = (assignment: any) => {
    const submission = getSubmissionForAssignment(assignment.id);
    const dueDate = new Date(assignment.due_date);
    
    return (
      <Card key={assignment.id} className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center space-x-2">
                {getTypeIcon(assignment.assignment_type)}
                <CardTitle className="text-lg">{assignment.title}</CardTitle>
              </div>
              <CardDescription>{assignment.description}</CardDescription>
            </div>
            {getStatusBadge(assignment)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Due: {format(dueDate, 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{assignment.grading_period.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>

          {assignment.notes && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{assignment.notes}</p>
            </div>
          )}

          {assignment.sheet_music && (
            <div className="flex items-center space-x-2 text-sm">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span>{assignment.sheet_music.title}</span>
              {assignment.sheet_music.composer && (
                <span className="text-muted-foreground">by {assignment.sheet_music.composer}</span>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-muted-foreground">
              Points: {assignment.points_possible || 100}
            </div>
            
            {!submission || submission.status === 'assigned' ? (
              <Button onClick={() => handleStartAssignment(assignment)}>
                Start Assignment
              </Button>
            ) : submission.status === 'in_progress' ? (
              <Button variant="outline" onClick={() => handleStartAssignment(assignment)}>
                Continue
              </Button>
            ) : submission.status === 'submitted' ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Submitted</span>
              </div>
            ) : submission.status === 'graded' ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  {submission.score_value ? `${submission.score_value}%` : 'Graded'}
                </Badge>
              </div>
            ) : null}
          </div>

          {submission?.feedback && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Instructor Feedback:</p>
              <p className="text-sm text-blue-800 mt-1">{submission.feedback}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Assignments ({allAssignments.length})</TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({overdueAssignments.length})
            {overdueAssignments.length > 0 && (
              <AlertCircle className="h-4 w-4 ml-1 text-red-500" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {allAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No assignments yet</h3>
                <p className="text-muted-foreground text-center">
                  Check back later for new sight reading assignments from your instructor.
                </p>
              </CardContent>
            </Card>
          ) : (
            allAssignments.map(renderAssignmentCard)
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No upcoming assignments</h3>
                <p className="text-muted-foreground text-center">
                  You're all caught up! Check back later for new assignments.
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingAssignments.map(renderAssignmentCard)
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {overdueAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No overdue assignments</h3>
                <p className="text-muted-foreground text-center">
                  Great job staying on top of your assignments!
                </p>
              </CardContent>
            </Card>
          ) : (
            overdueAssignments.map(renderAssignmentCard)
          )}
        </TabsContent>
      </Tabs>

      <AssignmentSubmissionDialog
        assignment={selectedAssignment}
        open={submissionDialogOpen}
        onOpenChange={setSubmissionDialogOpen}
        user={user}
      />
    </div>
  );
};