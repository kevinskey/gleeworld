import React from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateAssignmentDialogProps {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AssignmentFormData {
  title: string;
  description?: string;
  assignment_type: string;
  category?: string;
  points: number;
  due_at?: string;
  instructions?: string;
  rubric?: string;
  is_active: boolean;
}

export const CreateAssignmentDialog: React.FC<CreateAssignmentDialogProps> = ({
  courseId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AssignmentFormData>({
    defaultValues: {
      assignment_type: 'other',
      is_active: true,
    }
  });

  const assignmentType = watch('assignment_type');
  const isActive = watch('is_active');

  const createMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('gw_assignments').insert({
        course_id: courseId,
        created_by: user.id,
        ...data,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gw-course-assignments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['gw-course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['gradebook', courseId] });
      toast.success('Assignment created successfully');
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to create assignment');
      console.error(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register('title', { required: 'Title is required' })} />
            {errors.title && <span className="text-sm text-destructive">{errors.title.message}</span>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assignment_type">Assignment Type</Label>
              <Select value={assignmentType} onValueChange={(value) => setValue('assignment_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="listening_journal">Listening Journal</SelectItem>
                  <SelectItem value="reflection_paper">Reflection Paper</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...register('category')} placeholder="e.g., Journals, Exams" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="points">Points *</Label>
              <Input id="points" type="number" {...register('points', { required: 'Points required', min: 0, valueAsNumber: true })} />
              {errors.points && <span className="text-sm text-destructive">{errors.points.message}</span>}
            </div>

            <div>
              <Label htmlFor="due_at">Due Date</Label>
              <Input id="due_at" type="date" {...register('due_at')} />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea id="instructions" {...register('instructions')} rows={4} placeholder="Detailed instructions for students" />
          </div>

          <div>
            <Label htmlFor="rubric">Rubric</Label>
            <Textarea id="rubric" {...register('rubric')} rows={4} placeholder="Grading criteria and rubric" />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              id="is_active" 
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked as boolean)}
            />
            <Label htmlFor="is_active">Active (visible to students)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
