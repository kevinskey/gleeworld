import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_by: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  content_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Joined fields
  assignee_name?: string;
  assigner_name?: string;
}

export interface TaskNotification {
  id: string;
  task_id: string;
  user_id: string;
  notification_type: 'assigned' | 'due_soon' | 'overdue' | 'completed' | 'updated';
  message: string;
  is_read: boolean;
  created_at: string;
  task?: Task;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch tasks assigned to or created by current user
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks((data || []) as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    }
  };

  // Fetch notifications for current user
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('task_notifications')
        .select(`
          *,
          task:tasks(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as TaskNotification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Create a new task
  const createTask = async (taskData: {
    title: string;
    description?: string;
    assigned_to: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    content_id?: string;
  }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...taskData,
          assigned_by: user.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchTasks();
      
      toast({
        title: "Task Created",
        description: "Task has been assigned successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      await fetchTasks();
      
      toast({
        title: "Task Updated",
        description: `Task marked as ${status.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('task_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from('task_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Get tasks by various filters
  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getMyTasks = async () => {
    const { data: user } = await supabase.auth.getUser();
    return tasks.filter(task => task.assigned_to === user.user?.id);
  };

  const getTasksICreated = async () => {
    const { data: user } = await supabase.auth.getUser();
    return tasks.filter(task => task.assigned_by === user.user?.id);
  };

  const getOverdueTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => 
      task.due_date && 
      task.due_date < today && 
      task.status !== 'completed'
    );
  };

  const getUnreadNotificationCount = () => {
    return notifications.filter(notif => !notif.is_read).length;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchNotifications()]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions with unique channel names
    const tasksChannelName = `tasks_changes_${Date.now()}_${Math.random()}`;
    const notificationsChannelName = `task_notifications_changes_${Date.now()}_${Math.random()}`;
    
    const tasksSubscription = supabase
      .channel(tasksChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, () => {
        fetchTasks();
      })
      .subscribe();

    const notificationsSubscription = supabase
      .channel(notificationsChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_notifications' 
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
    };
  }, []);

  return {
    tasks,
    notifications,
    loading,
    createTask,
    updateTaskStatus,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getTasksByStatus,
    getMyTasks,
    getTasksICreated,
    getOverdueTasks,
    getUnreadNotificationCount,
    refetch: () => Promise.all([fetchTasks(), fetchNotifications()])
  };
};