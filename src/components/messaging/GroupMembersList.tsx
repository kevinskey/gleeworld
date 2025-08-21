import React from 'react';
import { useGroupMembers } from '@/hooks/useMessaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupMembersListProps {
  groupId: string | null;
}

export const GroupMembersList: React.FC<GroupMembersListProps> = ({ groupId }) => {
  const { data: members, isLoading } = useGroupMembers(groupId || undefined);

  if (!groupId) return null;

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return <User className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'moderator':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-lg">Members</h3>
        <p className="text-sm text-muted-foreground">
          {members?.length || 0} member{members?.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {members?.map((member) => {
            const userName = member.user_profile?.full_name || 'Unknown User';
            const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
            
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user_profile?.avatar_url} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {userName}
                    </span>
                    {getRoleIcon(member.role)}
                  </div>
                  
                  {member.role !== 'member' && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-2 py-0 mt-1", getRoleBadgeColor(member.role))}
                    >
                      {member.role}
                    </Badge>
                  )}
                </div>
                
                {member.is_muted && (
                  <div className="text-muted-foreground">
                    <span className="text-xs">🔇</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {(!members || members.length === 0) && (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No Members</h3>
            <p className="text-sm text-muted-foreground">
              This group has no members yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};