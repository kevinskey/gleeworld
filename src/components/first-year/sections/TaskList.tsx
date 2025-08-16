import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, AlertCircle, Calendar } from "lucide-react";
import { useFirstYearData } from "@/hooks/useFirstYearData";
import { formatDistanceToNow, format, isPast } from "date-fns";

export const TaskList = () => {
  const { taskSubmissions } = useFirstYearData();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500';
      case 'reviewed': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'reviewed': return <AlertCircle className="h-4 w-4" />;
      case 'approved': return <CheckSquare className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const upcomingTasks = [
    {
      title: "Voice Lesson Reflection #1",
      description: "Submit a 500-word reflection on your first voice lesson experience",
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      task_type: "assignment"
    },
    {
      title: "Sight-Reading Assessment",
      description: "Complete the online sight-reading assessment for Week 3",
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      task_type: "assessment"
    },
    {
      title: "Repertoire Listening Log",
      description: "Listen to and analyze 3 pieces from our current repertoire",
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      task_type: "assignment"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          Tasks & Assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upcoming Tasks */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
              Upcoming Tasks
            </h4>
            <div className="space-y-3">
              {upcomingTasks.map((task, index) => {
                const dueDate = new Date(task.due_date);
                const isOverdue = isPast(dueDate);
                
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border transition-colors hover:bg-muted/30 ${
                      isOverdue ? 'border-red-200 bg-red-50/50' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold">{task.title}</h5>
                          <Badge variant={task.task_type === 'assessment' ? 'default' : 'secondary'}>
                            {task.task_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                            Due {format(dueDate, 'MMM d, yyyy')} 
                            ({formatDistanceToNow(dueDate, { addSuffix: true })})
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Start Task
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submitted Tasks */}
          {taskSubmissions && taskSubmissions.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                Recent Submissions
              </h4>
              <div className="space-y-3">
                {taskSubmissions.slice(0, 3).map((submission) => (
                  <div 
                    key={submission.id}
                    className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold">{submission.title}</h5>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${getStatusColor(submission.status)}`}>
                            {getStatusIcon(submission.status)}
                            {submission.status}
                          </div>
                        </div>
                        {submission.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {submission.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Submitted {formatDistanceToNow(new Date(submission.submitted_at || submission.created_at), { addSuffix: true })}
                          </span>
                          {submission.grade && (
                            <span className="font-medium">Grade: {submission.grade}</span>
                          )}
                        </div>
                        {submission.feedback && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <strong>Feedback:</strong> {submission.feedback}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};