import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Calendar, Award } from 'lucide-react';

interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
}

export const CreateDiscussionDialog: React.FC<CreateDiscussionDialogProps> = ({
  open,
  onOpenChange,
  courseId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGraded, setIsGraded] = useState(false);
  const [maxPoints, setMaxPoints] = useState(10);
  const [dueDate, setDueDate] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in');
      
      const { data, error } = await supabase
        .from('course_discussions')
        .insert({
          course_id: courseId,
          title: title.trim(),
          content: content.trim(),
          created_by: user.id,
          reply_count: 0,
          is_locked: false,
          is_graded: isGraded,
          max_points: isGraded ? maxPoints : null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-discussions', courseId] });
      toast.success('Discussion created successfully');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create discussion');
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsGraded(false);
    setMaxPoints(10);
    setDueDate('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (isGraded && maxPoints <= 0) {
      toast.error('Max points must be greater than 0');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Start a New Discussion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter discussion title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="What would you like to discuss?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={createMutation.isPending}
              rows={6}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date (Optional)
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={createMutation.isPending}
            />
          </div>

          {/* Grading Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="isGraded" className="text-sm font-medium">
                  Graded Discussion
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable grading for student participation
                </p>
              </div>
            </div>
            <Switch
              id="isGraded"
              checked={isGraded}
              onCheckedChange={setIsGraded}
              disabled={createMutation.isPending}
            />
          </div>

          {/* Max Points (only shown when graded) */}
          {isGraded && (
            <div className="space-y-2">
              <Label htmlFor="maxPoints">Maximum Points</Label>
              <Input
                id="maxPoints"
                type="number"
                min={1}
                max={100}
                value={maxPoints}
                onChange={(e) => setMaxPoints(parseInt(e.target.value) || 10)}
                disabled={createMutation.isPending}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Discussion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
