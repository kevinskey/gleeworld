import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(isEnrolled);

  const handleStartAssignment = (assignment: Assignment) => {
    // Navigate to MUS-240 assignment submission page
    navigate(`/mus-240/assignments/${assignment.id}`);
  };

  // Check if user has admin access directly from profile
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (isEnrolled) {
        setHasAccess(true);
        return;
      }
      if (!user?.id) {
        setHasAccess(false);
        return;
      }
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isAdmin = !!(profile?.is_admin || profile?.is_super_admin);
      setHasAccess(isEnrolled || isAdmin);
    };
    checkAdminAccess();
  }, [user?.id, isEnrolled]);

  useEffect(() => {
    if (hasAccess) {
      fetchAssignments();
    } else {
      setLoading(false);
    }
  }, [courseId, hasAccess, user]);

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

  if (!hasAccess) {
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ClipboardList className="h-5 w-5 text-primary" />
          Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[200px]">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[180px]">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-1">No Assignments Yet</p>
            <p className="text-sm text-muted-foreground/70">
              Check back later for upcoming assignments and due dates.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map(assignment => (
              <div 
                key={assignment.id} 
                className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{assignment.title}</h4>
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
                      Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'No due date'}
                    </span>
                    <span>{assignment.points} points</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-border text-foreground hover:bg-accent"
                  onClick={() => handleStartAssignment(assignment)}
                >
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
