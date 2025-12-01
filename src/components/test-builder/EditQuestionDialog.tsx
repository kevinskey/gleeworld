import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateQuestion, useCreateAnswerOptions, useDeleteAnswerOptions, type TestQuestion, type AnswerOption } from '@/hooks/useTestBuilder';
import { Plus, X } from 'lucide-react';
import { MediaUploadSection } from './MediaUploadSection';

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  question: TestQuestion | null;
  existingOptions: AnswerOption[];
}

interface QuestionFormData {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'audio_listening' | 'video_watching' | 'file_upload';
  points: number;
  media_type: string | null;
  media_url: string | null;
  youtube_video_id: string | null;
}

interface AnswerOptionData {
  id?: string;
  text: string;
  is_correct: boolean;
}

export const EditQuestionDialog = ({ open, onOpenChange, testId, question, existingOptions }: EditQuestionDialogProps) => {
  const updateQuestion = useUpdateQuestion();
  const createAnswerOptions = useCreateAnswerOptions();
  const deleteAnswerOptions = useDeleteAnswerOptions();
  
  const [questionType, setQuestionType] = useState<string>('multiple_choice');
  const [options, setOptions] = useState<AnswerOptionData[]>([
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ]);

  const { register, handleSubmit, reset, setValue } = useForm<QuestionFormData>({
    defaultValues: {
      points: 10,
      question_type: 'multiple_choice',
    },
  });

  // Initialize form when question changes
  useEffect(() => {
    if (question) {
      setQuestionType(question.question_type);
      setValue('question_text', question.question_text);
      setValue('question_type', question.question_type as any);
      setValue('points', question.points);
      setValue('media_type', question.media_type);
      setValue('media_url', question.media_url);
      setValue('youtube_video_id', question.youtube_video_id);

      // Set existing options
      if (existingOptions.length > 0) {
        setOptions(existingOptions.map(opt => ({
          id: opt.id,
          text: opt.option_text,
          is_correct: opt.is_correct,
        })));
      } else {
        setOptions([
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ]);
      }
    }
  }, [question, existingOptions, setValue]);

  const handleAddOption = () => {
    setOptions([...options, { text: '', is_correct: false }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: 'text' | 'is_correct', value: string | boolean) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const onSubmit = async (data: QuestionFormData) => {
    if (!question) return;

    // Debug log to verify what we're saving (especially media fields)
    console.log('EditQuestionDialog submit payload:', {
      questionId: question.id,
      testId,
      data,
    });

    // Update the question
    await updateQuestion.mutateAsync({
      id: question.id,
      testId,
      ...data,
      media_type: data.media_type as any,
    });

    // Handle answer options if it's multiple choice or true/false
    if (questionType === 'multiple_choice' || questionType === 'true_false') {
      // Delete all existing options first
      if (existingOptions.length > 0) {
        await deleteAnswerOptions.mutateAsync({ questionId: question.id, testId });
      }

      // Create new options
      const validOptions = options.filter(opt => opt.text.trim());
      if (validOptions.length > 0) {
        await createAnswerOptions.mutateAsync({
          options: validOptions.map((opt, index) => ({
            question_id: question.id,
            option_text: opt.text,
            is_correct: opt.is_correct,
            display_order: index,
          })),
          testId,
        });
      }
    }

    reset();
    onOpenChange(false);
  };

  const requiresOptions = questionType === 'multiple_choice' || questionType === 'true_false';

  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="question_type">Question Type</Label>
                <Select
                  value={questionType}
                  onValueChange={(value) => {
                    setQuestionType(value);
                    setValue('question_type', value as any);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="audio_listening">Audio Listening</SelectItem>
                    <SelectItem value="video_watching">Video Watching</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  {...register('points', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="question_text">Question Text</Label>
              <Textarea
                id="question_text"
                {...register('question_text', { required: true })}
                placeholder="Enter your question..."
                rows={3}
              />
            </div>

            <MediaUploadSection
              initialMediaType={question.media_type}
              initialMediaUrl={question.media_url}
              initialYoutubeId={question.youtube_video_id}
              onMediaChange={(mediaType, mediaUrl, youtubeId) => {
                setValue('media_type', mediaType);
                setValue('media_url', mediaUrl);
                setValue('youtube_video_id', youtubeId);
              }}
            />

            {requiresOptions && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Answer Options</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      />
                      <label className="flex items-center gap-2 px-3 border rounded-md cursor-pointer hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                        />
                        <span className="text-sm whitespace-nowrap">Correct</span>
                      </label>
                      {options.length > 2 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateQuestion.isPending}>
              {updateQuestion.isPending ? 'Updating...' : 'Update Question'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
