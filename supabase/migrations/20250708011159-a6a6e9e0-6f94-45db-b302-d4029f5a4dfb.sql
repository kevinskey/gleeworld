-- Create tasks table for duty assignments
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  content_id UUID, -- Reference to the content where this task was created
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks assigned to them
CREATE POLICY "Users can view their assigned tasks"
ON public.tasks
FOR SELECT
USING (auth.uid() = assigned_to);

-- Users can view tasks they created
CREATE POLICY "Users can view tasks they created"
ON public.tasks
FOR SELECT
USING (auth.uid() = assigned_by);

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Users can update status of tasks assigned to them
CREATE POLICY "Users can update their assigned tasks"
ON public.tasks
FOR UPDATE
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- Task creators can update their tasks
CREATE POLICY "Task creators can update their tasks"
ON public.tasks
FOR UPDATE
USING (auth.uid() = assigned_by)
WITH CHECK (auth.uid() = assigned_by);

-- Authenticated users can create tasks
CREATE POLICY "Authenticated users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (auth.uid() = assigned_by);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Create task notifications table
CREATE TABLE public.task_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('assigned', 'due_soon', 'overdue', 'completed', 'updated')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own task notifications"
ON public.task_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own task notifications"
ON public.task_notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create task notifications"
ON public.task_notifications
FOR INSERT
WITH CHECK (true);

-- Function to create task notification
CREATE OR REPLACE FUNCTION create_task_notification(
  task_id_param UUID,
  user_id_param UUID,
  notification_type_param TEXT,
  message_param TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.task_notifications (task_id, user_id, notification_type, message)
  VALUES (task_id_param, user_id_param, notification_type_param, message_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger to create notification when task is created
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  assignee_name TEXT;
  assigner_name TEXT;
BEGIN
  -- Get names for the notification
  SELECT COALESCE(full_name, email) INTO assignee_name
  FROM public.profiles WHERE id = NEW.assigned_to;
  
  SELECT COALESCE(full_name, email) INTO assigner_name
  FROM public.profiles WHERE id = NEW.assigned_by;
  
  -- Create notification for the assigned user
  PERFORM create_task_notification(
    NEW.id,
    NEW.assigned_to,
    'assigned',
    'You have been assigned a new task: ' || NEW.title || ' by ' || COALESCE(assigner_name, 'Unknown User')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_task_assigned_trigger
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

-- Trigger to create notification when task status changes
CREATE OR REPLACE FUNCTION notify_task_updated()
RETURNS TRIGGER AS $$
DECLARE
  assignee_name TEXT;
  message_text TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status != NEW.status THEN
    SELECT COALESCE(full_name, email) INTO assignee_name
    FROM public.profiles WHERE id = NEW.assigned_to;
    
    CASE NEW.status
      WHEN 'completed' THEN
        message_text := 'Task completed: ' || NEW.title;
        -- Notify the task creator
        PERFORM create_task_notification(
          NEW.id,
          NEW.assigned_by,
          'completed',
          message_text || ' by ' || COALESCE(assignee_name, 'Unknown User')
        );
      WHEN 'in_progress' THEN
        message_text := 'Task started: ' || NEW.title;
        -- Notify the task creator
        PERFORM create_task_notification(
          NEW.id,
          NEW.assigned_by,
          'updated',
          message_text || ' by ' || COALESCE(assignee_name, 'Unknown User')
        );
      ELSE
        message_text := 'Task status updated: ' || NEW.title || ' (' || NEW.status || ')';
        -- Notify the task creator
        PERFORM create_task_notification(
          NEW.id,
          NEW.assigned_by,
          'updated',
          message_text
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_task_updated_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_updated();