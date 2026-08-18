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
  /** Attach a Media Library recording (a class-copy row) to the new assignment. */
  mediaId?: string;
  /** Pre-fill the title (e.g. the shared recording's name). */
  defaultTitle?: string;
}

interface AssignmentFormData {
  title: string;
  description?: string;
  assignment_type: string;
  points: number;
  due_at?: string;
  instructions?: string;
  is_active: boolean;
}

export const CreateAssignmentDialog: React.FC<CreateAssignmentDialogProps> = ({
  courseId,
  open,
  onOpenChange,
  mediaId,
  defaultTitle,
}) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AssignmentFormData>({
    defaultValues: {
      title: defaultTitle ?? '',
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

      const { data: inserted, error } = await supabase.from('gw_course_assignments').insert({
        course_id: courseId,
        created_by: user.id,
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        assignment_type: data.assignment_type,
        points: data.points,
        due_date: data.due_at || null,
        is_published: data.is_active,
        media_id: mediaId ?? null,
      } as never).select('id');
      if (error) throw error;
      // Demo-tenant writes match 0 rows silently — treat empty as failure.
      if (!inserted || inserted.length === 0) throw new Error('Assignment was not saved (read-only workspace?)');
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
        {mediaId && (
          <p className="text-xs rounded-md bg-primary/5 text-primary px-3 py-2">
            A recording is attached — students will see a player on this assignment.
          </p>
        )}
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

          <div>
            <Label htmlFor="assignment_type">Assignment Type</Label>
            <Select value={assignmentType} onValueChange={(value) => setValue('assignment_type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="reflection_paper">Reflection Paper</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
