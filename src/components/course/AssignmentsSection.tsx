import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AssignmentsSectionProps {
  courseId: string;
}

export const AssignmentsSection: React.FC<AssignmentsSectionProps> = ({ courseId }) => {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['course-assignments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_items')
        .select('*')
        .eq('item_type', 'assignment')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (dueDate: string | null) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (due.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return <Badge variant="secondary">Due Soon</Badge>;
    }
    return <Badge variant="outline">Upcoming</Badge>;
  };

  if (isLoading) {
    return <div className="p-6">Loading assignments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Assignments</h2>
      </div>

      <div className="grid gap-4">
        {assignments && assignments.length > 0 ? (
          assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      {assignment.points && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {assignment.points} points
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(assignment.due_date)}
                </div>
              </CardHeader>
              <CardContent>
                {assignment.content_text && (
                  <p className="text-foreground/80 mb-4">{assignment.content_text}</p>
                )}
                <div className="flex items-center justify-between">
                  {assignment.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Due {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  )}
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No assignments yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
