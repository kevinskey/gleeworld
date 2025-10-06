import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTest } from '@/hooks/useTestBuilder';
import { useNavigate } from 'react-router-dom';

interface CreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
}

interface TestFormData {
  course_id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  total_points: number;
  passing_score: number;
  allow_retakes: boolean;
  show_correct_answers: boolean;
  randomize_questions: boolean;
}

export const CreateTestDialog = ({ open, onOpenChange, courseId }: CreateTestDialogProps) => {
  const navigate = useNavigate();
  const createTest = useCreateTest();
  const { register, handleSubmit, reset, setValue, watch } = useForm<TestFormData>({
    defaultValues: {
      course_id: courseId,
      total_points: 100,
      passing_score: 70,
      duration_minutes: 60,
      allow_retakes: false,
      show_correct_answers: true,
      randomize_questions: false,
    },
  });

  const selectedCourse = watch('course_id');

  const onSubmit = async (data: TestFormData) => {
    const test = await createTest.mutateAsync({
      ...data,
      is_published: false,
    });
    
    reset();
    onOpenChange(false);
    navigate(`/test-builder/${test.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Test</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="course_id">Course/Class *</Label>
              <Select value={selectedCourse} onValueChange={(value) => setValue('course_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mus240">MUS 240 - African American Music</SelectItem>
                  <SelectItem value="mus101">MUS 101 - Music Theory I</SelectItem>
                  <SelectItem value="mus102">MUS 102 - Music Theory II</SelectItem>
                  <SelectItem value="all">All Courses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Test Title *</Label>
              <Input
                id="title"
                {...register('title', { required: true })}
                placeholder="e.g., Week 1 Quiz"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of what this test covers..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                {...register('instructions')}
                placeholder="Detailed instructions for students..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  {...register('duration_minutes', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="total_points">Total Points</Label>
                <Input
                  id="total_points"
                  type="number"
                  {...register('total_points', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="passing_score">Passing Score (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  {...register('passing_score', { valueAsNumber: true })}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow_retakes">Allow Retakes</Label>
                <Switch id="allow_retakes" {...register('allow_retakes')} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_correct_answers">Show Correct Answers After Submission</Label>
                <Switch id="show_correct_answers" {...register('show_correct_answers')} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="randomize_questions">Randomize Question Order</Label>
                <Switch id="randomize_questions" {...register('randomize_questions')} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTest.isPending}>
              {createTest.isPending ? 'Creating...' : 'Create Test'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};