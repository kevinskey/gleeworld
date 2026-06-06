import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Trophy } from 'lucide-react';
import { TestBuilderModule } from './TestBuilderModule';
import { GradingModule } from './GradingModule';

/**
 * Assessment Hub — unified entry point for assessment authoring + grading.
 *
 * Tabs:
 *   - Tests   — create and edit tests, quizzes, exams
 *   - Grades  — gradebook and submission review
 *
 * Replaces 2 separate module entries: test-builder + grading.
 */
export const AssessmentHub = () => {
  const [tab, setTab] = useState('tests');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Assessments</h2>
        <p className="text-sm text-muted-foreground">
          Build tests and review grades.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="tests" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="grades" className="gap-1.5">
            <Trophy className="h-4 w-4" />
            Grades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="m-0">
          <TestBuilderModule />
        </TabsContent>
        <TabsContent value="grades" className="m-0">
          <GradingModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssessmentHub;
