import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Calendar, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
interface Assignment {
  id: string;
  title: string;
  description: string | null;
  assignment_type: string | null;
  points: number | null;
  due_date: string | null;
  is_published: boolean;
  created_at: string;
  display_order: number | null;
}
interface CourseAssignmentManagerProps {
  courseId: string;
  courseName?: string;
}
const ASSIGNMENT_TYPES = [{
  value: 'writing',
  label: 'Writing'
}, {
  value: 'exercise',
  label: 'Exercise'
}, {
  value: 'quiz',
  label: 'Quiz'
}, {
  value: 'journal',
  label: 'Journal'
}, {
  value: 'presentation',
  label: 'Presentation'
}, {
  value: 'practical',
  label: 'Practical'
}, {
  value: 'worksheet',
  label: 'Worksheet'
}, {
  value: 'exam',
  label: 'Exam'
}, {
  value: 'project',
  label: 'Project'
}, {
  value: 'discussion',
  label: 'Discussion'
}, {
  value: 'portfolio',
  label: 'Portfolio'
}];
export const CourseAssignmentManager: React.FC<CourseAssignmentManagerProps> = ({
  courseId,
  courseName
}) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set(['Week 1: Jan 14–20']));
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignment_type: 'exercise',
    points: 100,
    due_at: ''
  });

  // Fetch assignments
  const {
    data: assignments = [],
    isLoading
  } = useQuery({
    queryKey: ['course-assignments', courseId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('gw_course_assignments').select('*').eq('course_id', courseId).order('due_date', {
        ascending: true
      });
      if (error) throw error;
      return (data || []) as unknown as Assignment[];
    },
    enabled: !!courseId
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const {
        error
      } = await supabase.from('gw_course_assignments').insert({
        course_id: courseId,
        title: data.title,
        description: data.description || null,
        assignment_type: data.assignment_type,
        points: data.points,
        due_date: data.due_at || null,
        is_published: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId]
      });
      toast.success('Assignment created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: typeof formData;
    }) => {
      const {
        error
      } = await supabase.from('gw_course_assignments').update({
        title: data.title,
        description: data.description || null,
        assignment_type: data.assignment_type,
        points: data.points,
        due_date: data.due_at || null
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId]
      });
      toast.success('Assignment updated');
      setEditingAssignment(null);
      resetForm();
    },
    onError: error => {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        error
      } = await supabase.from('gw_course_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId]
      });
      toast.success('Assignment deleted');
    },
    onError: error => {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  });
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assignment_type: 'exercise',
      points: 100,
      due_at: ''
    });
  };
  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      assignment_type: assignment.assignment_type || 'exercise',
      points: assignment.points || 100,
      due_at: assignment.due_date ? format(new Date(assignment.due_date), "yyyy-MM-dd'T'HH:mm") : ''
    });
  };
  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (editingAssignment) {
      updateMutation.mutate({
        id: editingAssignment.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      deleteMutation.mutate(id);
    }
  };
  const toggleWeek = (week: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  };

  // Group assignments by due date month
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    let group = 'No Due Date';
    if (assignment.due_date) {
      const dueDate = new Date(assignment.due_date);
      group = format(dueDate, 'MMMM yyyy');
    }
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  // Sort groups by date
  const sortedGroups = Object.keys(groupedAssignments).sort((a, b) => {
    if (a === 'No Due Date') return 1;
    if (b === 'No Due Date') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });
  const getTypeBadgeColor = (type: string | null) => {
    switch (type) {
      case 'exam':
        return 'destructive';
      case 'project':
        return 'default';
      case 'presentation':
        return 'secondary';
      case 'quiz':
        return 'outline';
      default:
        return 'secondary';
    }
  };
  if (isLoading) {
    return <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading assignments...
        </CardContent>
      </Card>;
  }
  return <div className="space-y-1">
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Assignments</h2>
          <span className="text-xs text-muted-foreground">({assignments.length})</span>
        </div>
        <Dialog open={isCreateOpen || !!editingAssignment} onOpenChange={open => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingAssignment(null);
          resetForm();
        }
      }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-foreground">
              <div className="space-y-2">
                <Label className="text-foreground">Title *</Label>
                <Input value={formData.title} onChange={e => setFormData({
                ...formData,
                title: e.target.value
              })} placeholder="Assignment title" className="text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({
                ...formData,
                description: e.target.value
              })} placeholder="Assignment description" rows={3} className="text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Type</Label>
                  <Select value={formData.assignment_type} onValueChange={value => setFormData({
                  ...formData,
                  assignment_type: value
                })}>
                    <SelectTrigger className="text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_TYPES.map(type => <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Points</Label>
                  <Input type="number" value={formData.points} onChange={e => setFormData({
                  ...formData,
                  points: parseInt(e.target.value) || 0
                })} className="text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Due Date</Label>
                <Input type="datetime-local" value={formData.due_at} onChange={e => setFormData({
                ...formData,
                due_at: e.target.value
              })} className="text-foreground" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
              setIsCreateOpen(false);
              setEditingAssignment(null);
              resetForm();
            }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAssignment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="space-y-1 pr-2">
          {sortedGroups.map(group => {
            return (
            <Collapsible key={group} open={expandedWeeks.has(group)} onOpenChange={() => toggleWeek(group)}>
              <div className="border rounded-md bg-card">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedWeeks.has(group) ? <ChevronDown className="h-3 w-3 text-foreground" /> : <ChevronRight className="h-3 w-3 text-foreground" />}
                      <span className="text-sm font-medium text-foreground">{group}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                        {groupedAssignments[group].length}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {groupedAssignments[group].reduce((sum, a) => sum + (a.points || 0), 0)} pts
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-2 space-y-1">
                    {groupedAssignments[group].map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50 hover:bg-muted transition-colors text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium truncate text-foreground">{assignment.title}</span>
                          <Badge variant={getTypeBadgeColor(assignment.assignment_type)} className="text-xs px-1.5 py-0 h-4">
                            {assignment.assignment_type || 'task'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{assignment.points} pts</span>
                          {assignment.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(assignment.due_date), 'M/d')}
                            </span>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(assignment)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(assignment.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )})}

          {sortedGroups.length === 0 && (
            <div className="border rounded-md p-8 text-center">
              <p className="text-muted-foreground text-sm mb-3">No assignments yet</p>
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Create First Assignment
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>;
};