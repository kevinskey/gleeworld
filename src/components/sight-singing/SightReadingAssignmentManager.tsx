import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Users, FileMusic, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  points_possible: number;
  target_type: string;
  target_value?: string;
  is_active: boolean;
  created_at: string;
  assigned_by: string;
  assignment_type: string;
  grading_period: string;
}

interface SightReadingAssignmentManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
  };
}

export const SightReadingAssignmentManager = ({ user }: SightReadingAssignmentManagerProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    due_date: '',
    points_possible: 100,
    target_type: 'all_members',
    target_value: '',
    grading_period: 'week_1' as const
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sight_reading_assignments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!user?.id) return;
    if (!newAssignment.title.trim() || !newAssignment.due_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and due date",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('gw_sight_reading_assignments')
        .insert({
          title: newAssignment.title,
          description: newAssignment.description,
          due_date: newAssignment.due_date,
          points_possible: newAssignment.points_possible,
          target_type: newAssignment.target_type,
          target_value: newAssignment.target_value,
          grading_period: newAssignment.grading_period,
          assigned_by: user.id,
          assignment_type: 'sight_reading' as const
        })
        .select()
        .single();

      if (error) throw error;

      setAssignments([data, ...assignments]);
      setShowCreateDialog(false);
      setNewAssignment({
        title: '',
        description: '',
        due_date: '',
        points_possible: 100,
        target_type: 'all_members',
        target_value: '',
        grading_period: 'week_1' as const
      });

      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_sight_reading_assignments')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setAssignments(assignments.filter(a => a.id !== id));
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  const getTargetDisplay = (assignment: Assignment) => {
    switch (assignment.target_type) {
      case 'all_members':
        return 'All Members';
      case 'voice_part':
        return `${assignment.target_value} Section`;
      case 'individual':
        return 'Individual Assignment';
      default:
        return assignment.target_type;
    }
  };

  const getDueDateColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'bg-red-100 text-red-800';
    if (diffDays <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Sight Reading Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Manage and track sight reading assignments for members
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                  placeholder="Enter assignment title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                  placeholder="Assignment description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={newAssignment.due_date}
                  onChange={(e) => setNewAssignment({...newAssignment, due_date: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="points">Points Possible</Label>
                <Input
                  id="points"
                  type="number"
                  value={newAssignment.points_possible}
                  onChange={(e) => setNewAssignment({...newAssignment, points_possible: parseInt(e.target.value) || 100})}
                  min="1"
                  max="1000"
                />
              </div>

              <div>
                <Label htmlFor="target">Assignment Target</Label>
                <Select 
                  value={newAssignment.target_type} 
                  onValueChange={(value) => setNewAssignment({...newAssignment, target_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_members">All Members</SelectItem>
                    <SelectItem value="voice_part">Specific Voice Part</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="grading_period">Grading Period</Label>
                <Select 
                  value={newAssignment.grading_period} 
                  onValueChange={(value: any) => setNewAssignment({...newAssignment, grading_period: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week_1">Week 1</SelectItem>
                    <SelectItem value="week_2">Week 2</SelectItem>
                    <SelectItem value="week_3">Week 3</SelectItem>
                    <SelectItem value="week_4">Week 4</SelectItem>
                    <SelectItem value="week_5">Week 5</SelectItem>
                    <SelectItem value="week_6">Week 6</SelectItem>
                    <SelectItem value="week_7">Week 7</SelectItem>
                    <SelectItem value="week_8">Week 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newAssignment.target_type === 'voice_part' && (
                <div>
                  <Label htmlFor="voice_part">Voice Part</Label>
                  <Select 
                    value={newAssignment.target_value} 
                    onValueChange={(value) => setNewAssignment({...newAssignment, target_value: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Soprano 1">Soprano 1</SelectItem>
                      <SelectItem value="Soprano 2">Soprano 2</SelectItem>
                      <SelectItem value="Alto 1">Alto 1</SelectItem>
                      <SelectItem value="Alto 2">Alto 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAssignment} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileMusic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assignments Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first sight reading assignment to get started
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    {assignment.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignment.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge 
                    variant="outline" 
                    className={getDueDateColor(assignment.due_date)}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </Badge>
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {getTargetDisplay(assignment)}
                  </Badge>
                  <Badge variant="outline">
                    {assignment.points_possible} pts
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Created {new Date(assignment.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Submissions
                    </Button>
                    <Button size="sm">
                      Manage Assignment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};