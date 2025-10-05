import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateQuestion, useCreateAnswerOptions } from '@/hooks/useTestBuilder';
import { Plus, X } from 'lucide-react';
import { MediaUploadSection } from './MediaUploadSection';

interface AddQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  nextDisplayOrder: number;
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
  text: string;
  is_correct: boolean;
}

export const AddQuestionDialog = ({ open, onOpenChange, testId, nextDisplayOrder }: AddQuestionDialogProps) => {
  const createQuestion = useCreateQuestion();
  const createAnswerOptions = useCreateAnswerOptions();
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
    const question = await createQuestion.mutateAsync({
      test_id: testId,
      ...data,
      media_type: data.media_type as any,
      display_order: nextDisplayOrder,
    });

    // Create answer options if it's multiple choice or true/false
    if ((questionType === 'multiple_choice' || questionType === 'true_false') && options.some(opt => opt.text)) {
      const answerOptions = options
        .filter(opt => opt.text.trim())
        .map((opt, index) => ({
          question_id: question.id,
          option_text: opt.text,
          is_correct: opt.is_correct,
          display_order: index,
        }));

      await createAnswerOptions.mutateAsync({ options: answerOptions, testId });
    }

    reset();
    setOptions([{ text: '', is_correct: false }, { text: '', is_correct: false }]);
    onOpenChange(false);
  };

  const requiresOptions = questionType === 'multiple_choice' || questionType === 'true_false';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Question</DialogTitle>
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
            <Button type="submit" disabled={createQuestion.isPending}>
              {createQuestion.isPending ? 'Adding...' : 'Add Question'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};