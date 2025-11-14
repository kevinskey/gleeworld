import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssignInstructorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
}

export const AssignInstructorDialog: React.FC<AssignInstructorDialogProps> = ({
  open,
  onOpenChange,
  courseId,
  courseName,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: instructors } = useQuery({
    queryKey: ['potential-instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role, is_admin, is_super_admin')
        .or('role.eq.instructor,is_admin.eq.true,is_super_admin.eq.true')
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  const handleAssign = async () => {
    if (!selectedInstructor) {
      toast({
        title: 'No instructor selected',
        description: 'Please select an instructor to assign.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAssigning(true);

      // Update the course's created_by to assign instructor
      const { error } = await supabase
        .from('gw_courses' as any)
        .update({ created_by: selectedInstructor })
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: 'Instructor assigned',
        description: `Instructor has been assigned to ${courseName}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['gw-all-courses'] });
      onOpenChange(false);
      setSelectedInstructor('');
    } catch (error: any) {
      toast({
        title: 'Error assigning instructor',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Assign Instructor</DialogTitle>
          <DialogDescription>
            Assign an instructor to {courseName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="instructor">Select Instructor</Label>
            <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an instructor..." />
              </SelectTrigger>
              <SelectContent>
                {instructors?.map((instructor) => (
                  <SelectItem key={instructor.user_id} value={instructor.user_id}>
                    {instructor.full_name || instructor.email} 
                    {instructor.is_super_admin ? ' (Super Admin)' : 
                     instructor.is_admin ? ' (Admin)' : 
                     instructor.role === 'instructor' ? ' (Instructor)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isAssigning || !selectedInstructor}>
            {isAssigning ? 'Assigning...' : 'Assign Instructor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
