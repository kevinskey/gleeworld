import { Edit, Trash2, Eye, Copy } from 'lucide-react';
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
      <div className="space-y-3">
        {tests.map((test) => (
          <div
            key={test.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold">{test.title}</h3>
                {test.is_published ? (
                  <Badge variant="default">Published</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
              {test.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {test.description}
                </p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>{test.total_points} points</span>
                {test.duration_minutes && <span>{test.duration_minutes} minutes</span>}
                <span>Pass: {test.passing_score}%</span>
              </div>
            </div>

            <div className="flex gap-2">
              {test.id === 'original-midterm' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/classes/mus240/midterm')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/classes/mus240/instructor/console?tab=grades')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Grades
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/test-builder/${test.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/test/${test.id}/preview`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestToDelete(test.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
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