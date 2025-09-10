import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, BookOpen, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useUserAssignments } from '@/hooks/useUserAssignments';
import { format, isAfter } from 'date-fns';

export const UserInfoCard: React.FC = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { stats, loading: statsLoading } = usePracticeStats();
  const { assignments, loading: assignmentsLoading } = useUserAssignments();

  const formatLastPracticed = (lastPracticed?: Date) => {
    if (!lastPracticed) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastPracticed.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return lastPracticed.toLocaleDateString();
  };

  const formatTotalHours = (totalMinutes?: number) => {
    if (!totalMinutes) return '0h 0m';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'No due date';
    const date = new Date(dueDate);
    const now = new Date();
    
    if (isAfter(now, date)) {
      return `Overdue: ${format(date, 'MMM d')}`;
    }
    return format(date, 'MMM d');
  };

  // Get overdue assignments
  const overdueAssignments = assignments.due.filter(assignment => {
    if (!assignment.due_date) return false;
    return isAfter(new Date(), new Date(assignment.due_date));
  });

  const upcomingAssignments = assignments.due.filter(assignment => {
    if (!assignment.due_date) return true;
    return !isAfter(new Date(), new Date(assignment.due_date));
  });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          Practice Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Name Section */}
        <div className="space-y-1">
          <div className="font-semibold text-foreground">
            {userProfile?.full_name || userProfile?.first_name || user?.email?.split('@')[0] || 'Student'}
          </div>
          {userProfile?.role && (
            <Badge variant="secondary" className="text-xs">
              {userProfile.role}
            </Badge>
          )}
        </div>

        {/* Practice Statistics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last practiced:</span>
            <span className="font-medium">
              {statsLoading ? '...' : formatLastPracticed(stats?.lastPracticed)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total practice time:</span>
            <span className="font-medium">
              {statsLoading ? '...' : formatTotalHours(stats?.totalMinutes)}
            </span>
          </div>
        </div>

        {/* Assignments Section */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Assignments</div>
          
          {assignmentsLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Due Assignments */}
              {(overdueAssignments.length > 0 || upcomingAssignments.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Due ({overdueAssignments.length + upcomingAssignments.length})
                    </span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {overdueAssignments.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{assignment.title}</span>
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {formatDueDate(assignment.due_date)}
                        </Badge>
                      </div>
                    ))}
                    {upcomingAssignments.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{assignment.title}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {formatDueDate(assignment.due_date)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Assignments */}
              {assignments.completed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Completed ({assignments.completed.length})
                    </span>
                  </div>
                  <div className="space-y-1 max-h-16 overflow-y-auto">
                    {assignments.completed.slice(0, 3).map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{assignment.title}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Done
                        </Badge>
                      </div>
                    ))}
                    {assignments.completed.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{assignments.completed.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {assignments.due.length === 0 && assignments.completed.length === 0 && (
                <div className="text-xs text-muted-foreground">No assignments</div>
              )}
            </>
          )}
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>This week: {formatTotalHours(stats.thisWeekMinutes)}</div>
              <div>Sessions: {stats.totalSessions || 0}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};