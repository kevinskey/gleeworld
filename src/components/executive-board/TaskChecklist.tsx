import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to_position: string;
}

export const TaskChecklist = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_executive_board_tasks')
        .select('*')
        .or(`assigned_to_user_id.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Add predefined tasks if no tasks exist
      const dbTasks = data || [];
      if (dbTasks.length === 0) {
        const predefinedTasks = [
          {
            id: 'temp-1',
            title: 'Fall Music Packet',
            description: 'Prepare and distribute fall semester music packet',
            status: 'pending',
            priority: 'high',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            assigned_to_position: 'music_director'
          },
          {
            id: 'temp-2',
            title: 'Spring Music Packet',
            description: 'Prepare and distribute spring semester music packet',
            status: 'pending',
            priority: 'medium',
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            assigned_to_position: 'music_director'
          },
          {
            id: 'temp-3',
            title: 'Pearls Dress',
            description: 'Order and organize pearls dress for performances',
            status: 'pending',
            priority: 'high',
            due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            assigned_to_position: 'president'
          },
          {
            id: 'temp-4',
            title: 'Lipstick',
            description: 'Purchase performance lipstick for all members',
            status: 'pending',
            priority: 'medium',
            due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            assigned_to_position: 'secretary'
          }
        ];
        setTasks(predefinedTasks);
      } else {
        setTasks(dbTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('gw_executive_board_tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus }
          : task
      ));

      // Log the action
      await supabase.rpc('log_executive_board_action', {
        p_action_type: 'task_updated',
        p_action_description: `Updated task status to ${newStatus}`,
        p_related_entity_type: 'task',
        p_related_entity_id: taskId,
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Task Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground">Loading tasks...</div>
        ) : tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={(checked) => 
                    updateTaskStatus(task.id, checked ? 'completed' : 'pending')
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h4>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground text-center py-4">
            No tasks assigned
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="text-muted-foreground">
              Task creation form coming soon...
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};