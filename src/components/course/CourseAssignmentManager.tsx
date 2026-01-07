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
  category: string | null;
  points: number | null;
  due_at: string | null;
  is_active: boolean;
  created_at: string;
}
interface CourseAssignmentManagerProps {
  courseId: string;
  courseName?: string;
}
const ASSIGNMENT_TYPES = [{
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
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set(['Week 1']));
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignment_type: 'exercise',
    category: 'Week 1',
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
      } = await supabase.from('gw_assignments').select('*').eq('course_id', courseId).order('category', {
        ascending: true
      });
      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!courseId
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const {
        error
      } = await supabase.from('gw_assignments').insert({
        course_id: courseId,
        title: data.title,
        description: data.description || null,
        assignment_type: data.assignment_type,
        category: data.category,
        points: data.points,
        due_at: data.due_at || null,
        is_active: true
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
      } = await supabase.from('gw_assignments').update({
        title: data.title,
        description: data.description || null,
        assignment_type: data.assignment_type,
        category: data.category,
        points: data.points,
        due_at: data.due_at || null
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
      } = await supabase.from('gw_assignments').delete().eq('id', id);
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
      category: 'Week 1',
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
      category: assignment.category || 'Week 1',
      points: assignment.points || 100,
      due_at: assignment.due_at ? format(new Date(assignment.due_at), "yyyy-MM-dd'T'HH:mm") : ''
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

  // Group assignments by category (week)
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const category = assignment.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  // Sort weeks properly
  const sortedWeeks = Object.keys(groupedAssignments).sort((a, b) => {
    const weekA = parseInt(a.replace(/\D/g, '')) || 999;
    const weekB = parseInt(b.replace(/\D/g, '')) || 999;
    return weekA - weekB;
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
  return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assignments</h2>
          <p className="text-muted-foreground">{assignments.length} total assignments</p>
        </div>
        <Dialog open={isCreateOpen || !!editingAssignment} onOpenChange={open => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingAssignment(null);
          resetForm();
        }
      }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={formData.title} onChange={e => setFormData({
                ...formData,
                title: e.target.value
              })} placeholder="Assignment title" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({
                ...formData,
                description: e.target.value
              })} placeholder="Assignment description" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.assignment_type} onValueChange={value => setFormData({
                  ...formData,
                  assignment_type: value
                })}>
                    <SelectTrigger>
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
                  <Label>Week/Category</Label>
                  <Select value={formData.category} onValueChange={value => setFormData({
                  ...formData,
                  category: value
                })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(16)].map((_, i) => <SelectItem key={i} value={i === 15 ? 'Finals Week' : `Week ${i + 1}`}>
                          {i === 15 ? 'Finals Week' : `Week ${i + 1}`}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input type="number" value={formData.points} onChange={e => setFormData({
                  ...formData,
                  points: parseInt(e.target.value) || 0
                })} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="datetime-local" value={formData.due_at} onChange={e => setFormData({
                  ...formData,
                  due_at: e.target.value
                })} />
                </div>
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

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-2 pr-4">
          {sortedWeeks.map(week => <Collapsible key={week} open={expandedWeeks.has(week)} onOpenChange={() => toggleWeek(week)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedWeeks.has(week) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <CardTitle className="text-lg">{week}</CardTitle>
                        <Badge variant="outline" className="ml-2 text-primary-foreground">
                          {groupedAssignments[week].length} assignments
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {groupedAssignments[week].reduce((sum, a) => sum + (a.points || 0), 0)} pts
                      </span>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {groupedAssignments[week].map(assignment => <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate text-primary-foreground">{assignment.title}</span>
                                <Badge variant={getTypeBadgeColor(assignment.assignment_type)}>
                                  {assignment.assignment_type || 'task'}
                                </Badge>
                              </div>
                              {assignment.description && <p className="text-sm truncate text-secondary-foreground">
                                  {assignment.description}
                                </p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-primary-foreground">{assignment.points} pts</span>
                            {assignment.due_at && <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(assignment.due_at), 'MMM d')}
                              </div>}
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(assignment)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(assignment.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>)}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>)}

          {sortedWeeks.length === 0 && <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No assignments yet</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Assignment
                </Button>
              </CardContent>
            </Card>}
        </div>
      </ScrollArea>
    </div>;
};