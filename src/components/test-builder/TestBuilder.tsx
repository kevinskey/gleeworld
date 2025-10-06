import { useState } from 'react';
import { Plus, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTests } from '@/hooks/useTestBuilder';
import { TestList } from './TestList';
import { CreateTestDialog } from './CreateTestDialog';
import { AICreateTestDialog } from './AICreateTestDialog';

interface TestBuilderProps {
  courseId: string;
  courseName: string;
}

export const TestBuilder = ({ courseId, courseName }: TestBuilderProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAICreateDialog, setShowAICreateDialog] = useState(false);
  const { data: tests, isLoading } = useTests(courseId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Test Builder - {courseName}
              </CardTitle>
              <CardDescription>
                Create, manage, and organize tests for this course
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAICreateDialog(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Create Test
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading tests...</p>
          ) : tests && tests.length > 0 ? (
            <TestList tests={tests} courseId={courseId} />
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tests yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first test
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTestDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        courseId={courseId}
      />

      <AICreateTestDialog
        open={showAICreateDialog}
        onOpenChange={setShowAICreateDialog}
        courseId={courseId}
      />
    </div>
  );
};