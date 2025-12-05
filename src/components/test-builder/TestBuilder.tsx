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
    <div className="space-y-4 md:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl text-foreground">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Test Builder - {courseName}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Create, manage, and organize tests for this course
              </CardDescription>
            </div>
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowAICreateDialog(true)}
                className="group relative overflow-hidden border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-xs sm:text-sm"
                size="sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 relative z-10 text-primary" />
                <span className="relative z-10">AI Create Test</span>
              </Button>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="group relative overflow-hidden bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm"
                size="sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 relative z-10" />
                <span className="relative z-10">Create Test</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : tests && tests.length > 0 ? (
            <TestList tests={tests} courseId={courseId} />
          ) : (
            <div className="text-center py-8 sm:py-12 space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">No tests yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto px-4">
                  Get started by creating your first test. You can use AI to generate questions automatically or create them manually.
                </p>
              </div>
              <div className="flex flex-col xs:flex-row gap-2 justify-center pt-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAICreateDialog(true)}
                  className="border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-xs sm:text-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-primary" />
                  AI Create First Test
                </Button>
                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="text-xs sm:text-sm">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Create First Test
                </Button>
              </div>
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