import { useState } from 'react';
import { Edit, Trash2, GripVertical, Image, Video, Music, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeleteQuestion, useDuplicateQuestion, type TestQuestion, type AnswerOption } from '@/hooks/useTestBuilder';
import { EditQuestionDialog } from './EditQuestionDialog';
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

interface QuestionListProps {
  questions: TestQuestion[];
  options: AnswerOption[];
  testId: string;
}

export const QuestionList = ({ questions, options, testId }: QuestionListProps) => {
  const deleteQuestion = useDeleteQuestion();
  const duplicateQuestion = useDuplicateQuestion();
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [questionToEdit, setQuestionToEdit] = useState<TestQuestion | null>(null);

  const getQuestionTypeLabel = (type: string) => {
    const labels = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
      short_answer: 'Short Answer',
      essay: 'Essay',
      audio_listening: 'Audio Listening',
      video_watching: 'Video Watching',
      file_upload: 'File Upload',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getMediaIcon = (mediaType: string | null) => {
    if (!mediaType) return null;
    
    const icons = {
      audio: <Music className="h-4 w-4" />,
      video: <Video className="h-4 w-4" />,
      image: <Image className="h-4 w-4" />,
      pdf: <FileText className="h-4 w-4" />,
      youtube: <Video className="h-4 w-4" />,
      slide: <FileText className="h-4 w-4" />,
    };
    return icons[mediaType as keyof typeof icons];
  };

  const getQuestionOptions = (questionId: string) => {
    return options.filter(opt => opt.question_id === questionId);
  };

  const handleDelete = () => {
    if (questionToDelete) {
      deleteQuestion.mutate({ id: questionToDelete, testId });
      setQuestionToDelete(null);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No questions yet. Add your first question to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {questions.map((question, index) => {
          const questionOptions = getQuestionOptions(question.id);

          return (
            <div
              key={question.id}
              className="flex gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start pt-1">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">Q{index + 1}</span>
                      <Badge variant="secondary">{getQuestionTypeLabel(question.question_type)}</Badge>
                      {question.media_type && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getMediaIcon(question.media_type)}
                          {question.media_type}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">{question.points} pts</span>
                    </div>
                    <p className="text-sm line-clamp-2">{question.question_text}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setQuestionToEdit(question)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateQuestion.mutate({ questionId: question.id, testId })}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestionToDelete(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {questionOptions.length > 0 && (
                  <div className="ml-4 mt-2 space-y-1">
                    {questionOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className={`w-4 h-4 rounded-full border-2 ${option.is_correct ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`} />
                        <span className={option.is_correct ? 'font-medium' : ''}>
                          {option.option_text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EditQuestionDialog
        open={!!questionToEdit}
        onOpenChange={(open) => !open && setQuestionToEdit(null)}
        testId={testId}
        question={questionToEdit}
        existingOptions={questionToEdit ? getQuestionOptions(questionToEdit.id) : []}
      />

      <AlertDialog open={!!questionToDelete} onOpenChange={() => setQuestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
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