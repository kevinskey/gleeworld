import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, User, CheckCircle, XCircle } from 'lucide-react';
import { useExecutiveBoardMembers } from '@/hooks/useExecutiveBoardMembers';

interface ExecutiveTeamOverviewProps {
  preview?: boolean;
  execRole?: string;
}

export const ExecutiveTeamOverview = ({ preview = false }: ExecutiveTeamOverviewProps) => {
  const { members, loading } = useExecutiveBoardMembers();

  const getRoleIcon = (position: string) => {
    if (position.toLowerCase().includes('president')) return <Crown className="h-4 w-4 text-yellow-600" />;
    return <User className="h-4 w-4 text-blue-600" />;
  };

  const formatPosition = (position: string) => {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusIcon = (hasUser: boolean) => {
    return hasUser ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <XCircle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Executive Team Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Executive Team Overview
            <Badge variant="secondary">{members.length} Members</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.slice(0, 3).map((member) => (
              <div key={member.user_id || member.position} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getRoleIcon(member.position)}
                  <span className="font-medium">{formatPosition(member.position)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(!!member.user_id)}
                  <span className="text-sm text-muted-foreground">
                    {member.full_name || 'Vacant'}
                  </span>
                </div>
              </div>
            ))}
            {members.length > 3 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                +{members.length - 3} more positions
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Executive Team Overview</h2>
        <Badge variant="outline">{members.length} Total Positions</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <Card key={member.user_id || member.position} className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {getRoleIcon(member.position)}
                {formatPosition(member.position)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(!!member.user_id)}
                  <span className="text-sm font-medium">
                    {member.user_id ? 'Assigned' : 'Vacant'}
                  </span>
                </div>
                
                {member.user_id ? (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <p className="font-medium">{member.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <p className="text-sm">{member.email || 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No member assigned to this position
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {members.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <User className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Executive Board Members</h3>
              <p>No executive board positions have been set up yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};