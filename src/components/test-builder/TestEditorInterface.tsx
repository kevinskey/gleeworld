import { useState } from 'react';
import { ArrowLeft, Plus, Save, Eye, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTest, useUpdateTest } from '@/hooks/useTestBuilder';
import { useNavigate, Link } from 'react-router-dom';
import { QuestionList } from './QuestionList';
import { TestSettings } from './TestSettings';
import { AddQuestionDialog } from './AddQuestionDialog';
import { AITestGeneratorDialog } from './AITestGeneratorDialog';
interface TestEditorInterfaceProps {
  testId: string;
}
export const TestEditorInterface = ({
  testId
}: TestEditorInterfaceProps) => {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    refetch
  } = useTest(testId);
  const updateTest = useUpdateTest();
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!data) {
    return <div>Test not found</div>;
  }
  const {
    test,
    questions,
    options
  } = data;
  const totalQuestionPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const pointsMatch = totalQuestionPoints === test.total_points;
  const handlePublishToggle = () => {
    updateTest.mutate({
      id: test.id,
      is_published: !test.is_published
    });
  };
  return <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard?module=test-builder" className="hover:text-foreground">
          Test Builder
        </Link>
        <span>/</span>
        <span className="text-foreground">{test.title}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard?module=test-builder')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            <p className="text-muted-foreground">
              {test.is_published ? 'Published' : 'Draft'} • {questions.length} questions
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/test/${test.id}/preview`)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handlePublishToggle}>
            {test.is_published ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          {/* Point Tracking Alert */}
          <Alert variant={pointsMatch ? "default" : "destructive"} className="text-white">
            <div className="flex items-center gap-2">
              {pointsMatch ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>
                <strong>Points: {totalQuestionPoints} / {test.total_points}</strong>
                {pointsMatch ? <span className="ml-2">All questions add up correctly!</span> : <span className="ml-2">
                    Questions total {totalQuestionPoints} points but test is set to {test.total_points} points. 
                    Adjust question points or update test settings.
                  </span>}
              </AlertDescription>
            </div>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    Add and manage questions for this test
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAIGenerator(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Generate 20 Questions
                  </Button>
                  <Button onClick={() => setShowAddQuestion(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <QuestionList questions={questions} options={options} testId={test.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <TestSettings test={test} />
        </TabsContent>
      </Tabs>

      <AddQuestionDialog open={showAddQuestion} onOpenChange={setShowAddQuestion} testId={test.id} nextDisplayOrder={questions.length + 1} />

      <AITestGeneratorDialog open={showAIGenerator} onOpenChange={setShowAIGenerator} testId={test.id} onQuestionsGenerated={refetch} />
    </div>;
};