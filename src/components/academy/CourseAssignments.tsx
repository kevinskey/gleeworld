import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Calendar, Lock, CheckCircle, Clock, AlertCircle, Music, ExternalLink } from 'lucide-react';
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
  source?: 'course' | 'readmusic';
  external_url?: string;
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
    // For ReadMusic assignments, open in new tab
    if (assignment.source === 'readmusic' && assignment.external_url) {
      window.open(assignment.external_url, '_blank');
      return;
    }
    // Navigate to the grading system's student assignment page for database-backed assignments
    navigate(`/grading/student/assignment/${assignment.id}`);
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
      // Fetch course assignments
      const { data: courseData, error: courseError } = await supabase
        .from('gw_course_assignments')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (courseError) throw courseError;

      // Fetch ReadMusic sight-reading assignments for THIS course only
      const { data: sightReadingData, error: srError } = await supabase
        .from('gw_sight_reading_assignments')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (srError) {
        console.error('Error fetching sight-reading assignments:', srError);
      }

      // Transform sight-reading assignments to match Assignment interface
      const readMusicAssignments: Assignment[] = (sightReadingData || []).map(sr => {
        // Extract external_id from notes field (format: "external_id:uuid | exercises:N")
        let externalId: string | null = null;
        if (sr.notes) {
          const match = sr.notes.match(/external_id:([a-f0-9-]+)/i);
          if (match) {
            externalId = match[1];
          }
        }
        
        return {
          id: sr.id,
          title: sr.title,
          description: sr.description || 'ReadMusic Sight-Reading Assignment',
          points: sr.points_possible || 100,
          due_date: sr.due_date,
          assignment_type: 'sight_reading',
          source: 'readmusic' as const,
          // Link directly to the assignment if we have an external_id
          external_url: externalId 
            ? `https://readmusic.gleeworld.org/assignment/${externalId}`
            : 'https://readmusic.gleeworld.org'
        };
      });

      // Combine both sources
      const allAssignments = [
        ...(courseData || []).map(a => ({ ...a, source: 'course' as const })),
        ...readMusicAssignments
      ];

      // Sort by due date
      allAssignments.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      // Fetch submissions for current user from BOTH tables
      if (user && courseData) {
        const assignmentIds = courseData.map(a => a.id);
        
        // Check gw_assignment_submissions (video/sight-reading assignments)
        const { data: videoSubmissions } = await supabase
          .from('gw_assignment_submissions')
          .select('assignment_id, status, score_value')
          .eq('user_id', user.id)
          .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none']);

        // Check gw_course_submissions (essay/general assignments)
        const { data: essaySubmissions } = await supabase
          .from('gw_course_submissions')
          .select('assignment_id, status, points_earned')
          .eq('student_id', user.id)
          .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none']);

        // Merge both submission sources into a single map
        const submissionMap = new Map<string, { status: string; grade: number | null }>();
        
        videoSubmissions?.forEach(s => {
          submissionMap.set(s.assignment_id, { status: s.status, grade: s.score_value });
        });
        
        essaySubmissions?.forEach(s => {
          submissionMap.set(s.assignment_id, { status: s.status, grade: s.points_earned });
        });

        const enrichedAssignments = allAssignments.map(assignment => ({
          ...assignment,
          submission: submissionMap.get(assignment.id)
        }));

        setAssignments(enrichedAssignments);
      } else {
        setAssignments(allAssignments);
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
                className={`flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors border ${
                  assignment.source === 'readmusic' ? 'border-blue-200 bg-blue-50/50' : 'border-border'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {assignment.source === 'readmusic' && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        <Music className="h-3 w-3 mr-1" />
                        ReadMusic
                      </Badge>
                    )}
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
                  {assignment.source === 'readmusic' ? (
                    <>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </>
                  ) : (
                    assignment.submission ? 'View' : 'Start'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
