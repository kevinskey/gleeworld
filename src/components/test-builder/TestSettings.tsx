import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateTest, type GleeAcademyTest } from '@/hooks/useTestBuilder';

interface TestSettingsProps {
  test: GleeAcademyTest;
}

interface TestFormData {
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  duration_minutes: number | null;
  total_points: number;
  passing_score: number;
  is_practice: boolean;
  allow_retakes: boolean;
  show_correct_answers: boolean;
  randomize_questions: boolean;
}

export const TestSettings = ({ test }: TestSettingsProps) => {
  const updateTest = useUpdateTest();
  const { register, handleSubmit, setValue, watch } = useForm<TestFormData>({
    defaultValues: {
      course_id: test.course_id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      duration_minutes: test.duration_minutes,
      total_points: test.total_points,
      passing_score: test.passing_score,
      is_practice: test.is_practice,
      allow_retakes: test.allow_retakes,
      show_correct_answers: test.show_correct_answers,
      randomize_questions: test.randomize_questions,
    },
  });

  const selectedCourse = watch('course_id');

  const onSubmit = (data: TestFormData) => {
    updateTest.mutate({
      id: test.id,
      ...data,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Settings</CardTitle>
        <CardDescription>Configure your test settings and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="course_id">Course/Class</Label>
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
              <Label htmlFor="title">Test Title</Label>
              <Input id="title" {...register('title')} />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea id="instructions" {...register('instructions')} rows={4} />
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
                <div className="space-y-0.5">
                  <Label htmlFor="is_practice">Practice Test</Label>
                  <p className="text-xs text-muted-foreground">Non-graded test for student practice</p>
                </div>
                <Switch id="is_practice" {...register('is_practice')} />
              </div>

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

          <div className="flex justify-end">
            <Button type="submit" disabled={updateTest.isPending}>
              {updateTest.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};