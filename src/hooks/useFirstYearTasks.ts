import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFirstYearTasks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fy-tasks"],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        // Get tasks with submission counts
        const { data: tasks, error: tasksError } = await supabase
          .from("fy_task_submissions")
          .select(`
            *,
            student:fy_students!inner(
              id,
              profile:gw_profiles!inner(full_name)
            )
          `)
          .order("due_date", { ascending: true });

        if (tasksError) throw tasksError;

        // Group tasks by title and aggregate data
        const taskGroups = new Map();
        
        tasks?.forEach(task => {
          const key = task.title;
          if (!taskGroups.has(key)) {
            taskGroups.set(key, {
              id: `task-${key.toLowerCase().replace(/\s+/g, '-')}`,
              title: task.title,
              description: task.description || "",
              dueDate: task.due_date,
              assignedTo: 0,
              completed: 0,
              submissions: [],
              priority: "medium", // Default priority
              status: "active"
            });
          }
          
          const taskGroup = taskGroups.get(key);
          taskGroup.assignedTo++;
          taskGroup.submissions.push(task);
          
          if (task.status === "submitted") {
            taskGroup.completed++;
          }

          // Determine status based on due date
          const now = new Date();
          const dueDate = new Date(task.due_date);
          
          if (dueDate < now && taskGroup.completed < taskGroup.assignedTo) {
            taskGroup.status = "overdue";
            taskGroup.priority = "high";
          }
        });

        // Convert map to array and add calculated fields
        const aggregatedTasks = Array.from(taskGroups.values()).map(task => {
          const completionRate = task.assignedTo > 0 ? (task.completed / task.assignedTo) * 100 : 0;
          
          return {
            ...task,
            completionRate: Math.round(completionRate)
          };
        });

        return aggregatedTasks;
      } catch (error) {
        console.error("Error fetching first-year tasks:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    retry: 1,
  });
};