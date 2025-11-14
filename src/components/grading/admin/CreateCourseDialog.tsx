import React from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CourseFormData {
  code: string;
  title: string;
  term: string;
  description: string;
}

export const CreateCourseDialog: React.FC<CreateCourseDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CourseFormData>();

  const onSubmit = async (data: CourseFormData) => {
    try {
      const { error } = await supabase
        .from('gw_courses' as any)
        .insert({
          code: data.code,
          title: data.title,
          term: data.term,
          description: data.description || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Course created',
        description: `${data.code} has been created successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ['gw-all-courses'] });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error creating course',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Add a new course to the grading system
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Course Code *</Label>
            <Input
              id="code"
              placeholder="e.g., MUS-240"
              {...register('code', { required: 'Course code is required' })}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Music Theory and Analysis"
              {...register('title', { required: 'Course title is required' })}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="term">Term *</Label>
            <Input
              id="term"
              placeholder="e.g., Fall 2025"
              {...register('term', { required: 'Term is required' })}
            />
            {errors.term && (
              <p className="text-sm text-destructive">{errors.term.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Course description (optional)"
              rows={3}
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
