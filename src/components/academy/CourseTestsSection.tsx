import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Brain, Play, Eye, RotateCcw, Clock, CheckCircle } from 'lucide-react';

interface CourseTestsSectionProps {
  courseId: string;
  legacyCourseId?: string; // For courses like MUS 240 that use 'mus240' in DB
}

export const CourseTestsSection: React.FC<CourseTestsSectionProps> = ({ 
  courseId, 
  legacyCourseId 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use legacy ID if provided, otherwise use courseId
  const dbCourseId = legacyCourseId || courseId;

  // Fetch published tests for this course
  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['course-tests', dbCourseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glee_academy_tests')
        .select('*')
        .eq('course_id', dbCourseId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch student's test submissions
  const { data: testSubmissions = [] } = useQuery({
    queryKey: ['test-submissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('test_submissions')
        .select('*')
        .eq('student_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (testsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Tests & Quizzes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading tests...</div>
        </CardContent>
      </Card>
    );
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Tests & Quizzes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tests available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Tests & Quizzes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((test: any) => {
            const submission = testSubmissions.find((s: any) => s.test_id === test.id);
            const hasSubmitted = submission && submission.status === 'submitted';
            const inProgress = submission && submission.status === 'in_progress';
            const isExam = test.title.toLowerCase().includes('midterm') || 
                           test.title.toLowerCase().includes('final') || 
                           test.title.toLowerCase().includes('exam');
            
            return (
              <div
                key={test.id}
                className="p-4 border rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      {isExam ? (
                        <FileCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Brain className="h-4 w-4 text-purple-500" />
                      )}
                      {test.title}
                    </h3>
                    {test.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {test.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{test.total_points} points</span>
                      {test.duration_minutes && (
                        <>
                          <span>•</span>
                          <span>{test.duration_minutes} min</span>
                        </>
                      )}
                      {submission?.percentage !== null && submission?.percentage !== undefined && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-blue-600">Score: {submission.percentage}%</span>
                        </>
                      )}
                    </div>
                  </div>
                  {hasSubmitted && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {inProgress && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      <Clock className="h-3 w-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
                
                <div className="mt-3 flex gap-2">
                  {hasSubmitted && test.show_correct_answers && submission && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/test/${test.id}/results/${submission.id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Results
                    </Button>
                  )}
                  {!hasSubmitted && !inProgress && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/test/${test.id}/take`)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Take Test
                    </Button>
                  )}
                  {inProgress && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/test/${test.id}/take`)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Continue Test
                    </Button>
                  )}
                  {hasSubmitted && test.allow_retakes && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/test/${test.id}`)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake Test
                    </Button>
                  )}
                  {hasSubmitted && !test.allow_retakes && (
                    <Button variant="outline" className="flex-1" size="sm" disabled>
                      Completed
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
