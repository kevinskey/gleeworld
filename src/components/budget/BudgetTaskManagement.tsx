import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, CheckCircle2, Clock, AlertCircle, X, User } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BudgetTaskManagementProps {
  eventId: string;
  eventName?: string;
}

const PRIORITY_COLORS = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-red-100 text-red-800"
};

const STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const STATUS_ICONS = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  cancelled: X
};

export const BudgetTaskManagement = ({ eventId, eventName }: BudgetTaskManagementProps) => {
  const { tasks, createTask, updateTaskStatus, loading } = useTasks();
  const { users } = useUsers();
  const { toast } = useToast();
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium" as "low" | "medium" | "high",
    due_date: undefined as Date | undefined
  });

  // Filter tasks related to this event/budget
  const eventTasks = tasks.filter(task => 
    task.content_id === eventId || 
    task.description?.includes(eventName || '') ||
    task.title.toLowerCase().includes('budget')
  );

  const handleCreateTask = async () => {
    if (!taskForm.title || !taskForm.assigned_to) {
      toast({
        title: "Validation Error",
        description: "Please fill in title and assignee",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTask({
        title: taskForm.title,
        description: taskForm.description,
        assigned_to: taskForm.assigned_to,
        priority: taskForm.priority,
        due_date: taskForm.due_date?.toISOString().split('T')[0],
        content_id: eventId
      });

      setTaskForm({
        title: "",
        description: "",
        assigned_to: "",
        priority: "medium",
        due_date: undefined
      });
      setShowCreateTask(false);

      toast({
        title: "Task Created",
        description: "Budget task has been assigned successfully",
      });
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus as any);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Task Management</CardTitle>
            <CardDescription>Assign and track budget-related tasks</CardDescription>
          </div>
          <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Budget Task</DialogTitle>
                <DialogDescription>
                  Assign a task related to this budget event
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="task-title">Task Title *</Label>
                  <Input
                    id="task-title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Research catering quotes"
                  />
                </div>
                <div>
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details about this task..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="task-assignee">Assign To *</Label>
                  <Select value={taskForm.assigned_to} onValueChange={(value) => setTaskForm(prev => ({ ...prev, assigned_to: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="task-priority">Priority</Label>
                    <Select value={taskForm.priority} onValueChange={(value: "low" | "medium" | "high") => setTaskForm(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !taskForm.due_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {taskForm.due_date ? format(taskForm.due_date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={taskForm.due_date}
                          onSelect={(date) => setTaskForm(prev => ({ ...prev, due_date: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCreateTask(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask}>
                    Create Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {eventTasks.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tasks assigned yet</p>
            <p className="text-sm">Create your first budget-related task</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventTasks.map(task => {
              const StatusIcon = STATUS_ICONS[task.status as keyof typeof STATUS_ICONS];
              const assignee = users.find(u => u.id === task.assigned_to);
              
              return (
                <div key={task.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={PRIORITY_COLORS[task.priority]}>
                          {task.priority} priority
                        </Badge>
                        <Badge className={STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {assignee && (
                          <span className="text-sm text-gray-600">
                            Assigned to: {assignee.full_name || assignee.email}
                          </span>
                        )}
                      </div>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {format(new Date(task.due_date), "PPP")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(task.id, 
                            task.status === 'pending' ? 'in_progress' : 'completed'
                          )}
                        >
                          {task.status === 'pending' ? 'Start' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};