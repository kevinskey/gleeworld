import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Trophy } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTest } from '@/hooks/useTestBuilder';

export default function TestPreview() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useTest(testId!);

  if (isLoading) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-6">
          <div>Loading...</div>
        </div>
      </UniversalLayout>
    );
  }

  if (!data || !testId) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-6">
          <div>Test not found</div>
        </div>
      </UniversalLayout>
    );
  }

  const { test, questions, options } = data;

  const getQuestionOptions = (questionId: string) => {
    return options.filter(opt => opt.question_id === questionId);
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
      short_answer: 'Short Answer',
      essay: 'Essay',
    };
    return labels[type] || type;
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant={test.is_published ? 'default' : 'secondary'}>
            {test.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{test.title}</CardTitle>
            {test.description && (
              <CardDescription className="text-base">{test.description}</CardDescription>
            )}
            <div className="flex gap-4 pt-4">
              {test.duration_minutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{test.duration_minutes} minutes</span>
                </div>
              )}
              {test.passing_score && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span>Passing score: {test.passing_score}%</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const questionOptions = getQuestionOptions(question.id);
            
            return (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{getQuestionTypeLabel(question.question_type)}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </span>
                      </div>
                      <CardTitle className="text-lg">
                        {index + 1}. {question.question_text}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {question.media_url && (
                    <div className="mb-4">
                      {question.media_type === 'image' && (
                        <img 
                          src={question.media_url} 
                          alt="Question media" 
                          className="max-w-md rounded-lg border"
                        />
                      )}
                      {question.media_type === 'audio' && (
                        <audio controls className="w-full max-w-md">
                          <source src={question.media_url} />
                        </audio>
                      )}
                      {question.media_type === 'video' && (
                        <video controls className="w-full max-w-md rounded-lg border">
                          <source src={question.media_url} />
                        </video>
                      )}
                    </div>
                  )}

                  {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
                    <div className="space-y-2">
                      {questionOptions.map((option, optIndex) => (
                        <div 
                          key={option.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            option.is_correct 
                              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm">
                            {String.fromCharCode(65 + optIndex)}
                          </div>
                          <div className="flex-1">
                            {option.option_text}
                            {option.is_correct && (
                              <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Correct Answer
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.question_type === 'short_answer' && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Students will provide a short text answer
                      </p>
                    </div>
                  )}

                  {question.question_type === 'essay' && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Students will provide a detailed essay response
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </UniversalLayout>
  );
}
