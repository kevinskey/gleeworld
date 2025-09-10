import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useUserAssignmentsSummary } from '@/hooks/useUserAssignmentsSummary';

export const UserInfoCard: React.FC = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { stats, loading: statsLoading } = usePracticeStats();
  const { summary, loading: assignmentsLoading } = useUserAssignmentsSummary();

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

  const incompleteAssignments = summary.incomplete + summary.overdue;
  const completedAssignments = summary.completed;

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

        {/* Assignment Status */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Assignments</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Incomplete</span>
            </div>
            <Badge variant={incompleteAssignments > 0 ? "destructive" : "secondary"}>
              {assignmentsLoading ? '...' : incompleteAssignments}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Completed</span>
            </div>
            <Badge variant="secondary">
              {assignmentsLoading ? '...' : completedAssignments}
            </Badge>
          </div>
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