import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TourTask {
  id: string;
  task_name: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
  tour_id: string;
  tour_city_id?: string;
}

interface TourTasksProps {
  tourId: string | null;
}

export const TourTasks: React.FC<TourTasksProps> = ({ tourId }) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
  });
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tour-tasks', tourId],
    queryFn: async () => {
      if (!tourId) return [];
      
      const { data, error } = await supabase
        .from('gw_tour_tasks')
        .select('*')
        .eq('tour_id', tourId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tourId,
  });

  const addTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      if (!tourId) throw new Error('No tour selected');

      const { data, error } = await supabase
        .from('gw_tour_tasks')
        .insert({
          tour_id: tourId,
          task_name: taskData.name,
          description: taskData.description || null,
          priority: taskData.priority,
          due_date: taskData.dueDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-tasks', tourId] });
      setNewTask({ name: '', description: '', priority: 'medium', dueDate: '' });
      setIsAddingTask(false);
      toast.success('Task added successfully!');
    },
    onError: (error) => {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('gw_tour_tasks')
        .update({ 
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null 
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-tasks', tourId] });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('gw_tour_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-tasks', tourId] });
      toast.success('Task deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    },
  });

  const handleAddTask = () => {
    if (newTask.name.trim()) {
      addTaskMutation.mutate(newTask);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (!tourId) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Save the tour overview first to manage tasks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tour Tasks</CardTitle>
            <Button
              onClick={() => setIsAddingTask(true)}
              disabled={isAddingTask}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAddingTask && (
            <div className="space-y-4 p-4 border border-dashed rounded-lg">
              <Input
                placeholder="Task name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                autoFocus
              />
              <Textarea
                placeholder="Description (optional)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={2}
              />
              <div className="flex gap-2">
                <Select 
                  value={newTask.priority} 
                  onValueChange={(value) => 
                    setNewTask({ ...newTask, priority: value as 'low' | 'medium' | 'high' })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddTask} 
                  disabled={!newTask.name.trim() || addTaskMutation.isPending}
                  size="sm"
                >
                  Add Task
                </Button>
                <Button 
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTask({ name: '', description: '', priority: 'medium', dueDate: '' });
                  }} 
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tasks added yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                     (task as any).is_completed ? 'bg-muted/30' : 'hover:bg-muted/50'
                   }`}
                 >
                   <Checkbox
                     checked={(task as any).is_completed}
                    onCheckedChange={(checked) =>
                      toggleTaskMutation.mutate({ taskId: task.id, completed: !!checked })
                    }
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                     <div className={`font-medium ${(task as any).is_completed ? 'line-through text-muted-foreground' : ''}`}>
                       {(task as any).task_name}
                    </div>
                    {task.description && (
                      <div className={`text-sm mt-1 ${(task as any).is_completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {task.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getPriorityColor(task.priority)} className="gap-1">
                        {getPriorityIcon(task.priority)}
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <Badge variant="outline" className="text-xs">
                          Due: {format(new Date(task.due_date), 'MMM d')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive opacity-60 hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};