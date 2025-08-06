import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Plus, FileText, User } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  created_at: string;
  assignee_name?: string;
}

interface ExecutiveTaskManagerProps {
  preview?: boolean;
  execRole?: string;
}

export const ExecutiveTaskManager = ({ preview = false, execRole }: ExecutiveTaskManagerProps) => {
  // Mock data for demonstration
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Prepare Monthly Report',
      description: 'Compile member attendance and performance metrics',
      assigned_to: 'user1',
      assigned_by: 'user2',
      status: 'pending',
      priority: 'high',
      due_date: '2025-08-15',
      created_at: '2025-08-01',
      assignee_name: 'Executive Member'
    },
    {
      id: '2',
      title: 'Coordinate Rehearsal Schedule',
      description: 'Update calendar and notify all members',
      assigned_to: 'user2',
      assigned_by: 'user1',
      status: 'in_progress',
      priority: 'medium',
      due_date: '2025-08-10',
      created_at: '2025-08-01',
      assignee_name: 'Secretary'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (preview) {
    return (
      <div className="space-y-3">
        {mockTasks.slice(0, 2).map((task) => (
          <div key={task.id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <span className="text-sm font-medium">{task.title}</span>
            </div>
            <Badge className={getPriorityColor(task.priority)} variant="outline">
              {task.priority}
            </Badge>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Task management coming soon...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Executive Tasks</h3>
        <Button size="sm" disabled>
          <Plus className="h-4 w-4 mr-1" />
          New Task
        </Button>
      </div>

      <div className="space-y-2">
        {mockTasks.map((task) => (
          <Card key={task.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(task.status)}
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <Badge className={getPriorityColor(task.priority)} variant="outline">
                    {task.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assignee_name}
                  </span>
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                >
                  Update
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center py-4 text-muted-foreground text-sm">
        Full task management functionality coming soon...
      </div>
    </div>
  );
};