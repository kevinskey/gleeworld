import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Calendar, Lock, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CourseAssignmentsProps {
  courseId: string;
  isEnrolled: boolean;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  points: number;
  due_date: string;
  assignment_type: string;
  submission?: {
    status: string;
    grade: number | null;
  };
}

export const CourseAssignments: React.FC<CourseAssignmentsProps> = ({ courseId, isEnrolled }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isEnrolled) {
      fetchAssignments();
    } else {
      setLoading(false);
    }
  }, [courseId, isEnrolled, user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_assignments')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Fetch submissions for current user
      if (user && data) {
        const { data: submissions } = await supabase
          .from('gw_course_submissions')
          .select('assignment_id, status, grade')
          .eq('student_id', user.id)
          .in('assignment_id', data.map(a => a.id));

        const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || []);

        const enrichedAssignments = data.map(assignment => ({
          ...assignment,
          submission: submissionMap.get(assignment.id)
        }));

        setAssignments(enrichedAssignments);
      } else {
        setAssignments(data || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (!assignment.submission) {
      const dueDate = new Date(assignment.due_date);
      const now = new Date();
      if (dueDate < now) {
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      }
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Not Started</Badge>;
    }

    if (assignment.submission.status === 'submitted') {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Submitted</Badge>;
    }

    if (assignment.submission.status === 'graded') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Grade: {assignment.submission.grade}/{assignment.points}
        </Badge>
      );
    }

    return <Badge variant="secondary">In Progress</Badge>;
  };

  if (!isEnrolled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Assignments</h3>
          <p className="text-muted-foreground">
            Enroll in this course to view and submit assignments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No assignments available yet.
          </p>
        ) : (
          <div className="space-y-4">
            {assignments.map(assignment => (
              <div 
                key={assignment.id} 
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{assignment.title}</h4>
                    {getStatusBadge(assignment)}
                  </div>
                  {assignment.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {assignment.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                    </span>
                    <span>{assignment.points} points</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {assignment.submission ? 'View' : 'Start'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
