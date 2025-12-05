import { Edit, Trash2, Eye, Copy, BarChart3, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useDeleteTest, type GleeAcademyTest } from '@/hooks/useTestBuilder';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface TestListProps {
  tests: GleeAcademyTest[];
  courseId: string;
}

export const TestList = ({ tests, courseId }: TestListProps) => {
  const navigate = useNavigate();
  const deleteTest = useDeleteTest();
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

  const handleDelete = () => {
    if (testToDelete) {
      deleteTest.mutate({ id: testToDelete, courseId });
      setTestToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-2 sm:space-y-3">
        {tests.map((test) => (
          <div
            key={test.id}
            className="group relative flex flex-col lg:flex-row lg:items-center justify-between p-3 sm:p-4 md:p-5 border rounded-lg sm:rounded-xl hover:shadow-md transition-all duration-200 bg-card hover:border-primary/30"
          >
            <div className="flex-1 space-y-1.5 sm:space-y-2 mb-3 lg:mb-0 lg:mr-4">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-semibold text-sm sm:text-base md:text-lg text-foreground">{test.title}</h3>
                {test.is_practice ? (
                  <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 text-[10px] sm:text-xs">Practice Test</Badge>
                ) : test.is_published ? (
                  <Badge variant="default" className="shadow-sm text-[10px] sm:text-xs">Published</Badge>
                ) : (
                  <Badge variant="secondary" className="border text-[10px] sm:text-xs">Draft</Badge>
                )}
              </div>
              {test.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 pr-0 lg:pr-4">
                  {test.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{test.total_points}</span> points
                </span>
                {test.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{test.duration_minutes}</span> min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  Pass: <span className="font-medium text-foreground">{test.passing_score}%</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {test.id === 'original-midterm' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/classes/mus240/midterm')}
                    className="hover:bg-accent hover:border-primary/30 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/classes/mus240/instructor/console?tab=grades')}
                    className="hover:bg-accent hover:border-primary/30 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Grades
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/test-builder/${test.id}`)}
                    className="hover:bg-accent hover:border-primary/30 transition-all text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/test/${test.id}/preview`)}
                    className="relative overflow-hidden bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all group/preview text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/20 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity" />
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 relative z-10" />
                    <span className="relative z-10">Preview</span>
                  </Button>
                  {test.is_published && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate(`/test/${test.id}/take`)}
                        className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                      >
                        <PlayCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Take Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/test/${test.id}/scores`)}
                        className="hover:bg-accent hover:border-primary/30 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                      >
                        <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">View </span>Scores
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestToDelete(test.id)}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!testToDelete} onOpenChange={() => setTestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this test? This action cannot be undone and will delete all questions and student submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};