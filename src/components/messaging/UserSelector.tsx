import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { useGroupMembers, useAddGroupMember, useRemoveGroupMember, useCreateDirectMessage } from '@/hooks/useMessaging';

interface UserSelectorProps {
  groupId?: string;
  onSelectUser?: (userId: string) => void;
  showDirectMessage?: boolean;
}

interface UserProfile {
  user_id: string;
  full_name?: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ 
  groupId, 
  onSelectUser,
  showDirectMessage = true 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: groupMembers } = useGroupMembers(groupId);
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const createDirectMessage = useCreateDirectMessage();

  // Fetch all users
  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, avatar_url, role')
        .order('full_name');

      if (error) throw error;
      return data as UserProfile[];
    }
  });

  const filteredUsers = allUsers?.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const memberUserIds = new Set(groupMembers?.map(member => member.user_id) || []);

  const handleAddMember = async (userId: string) => {
    if (!groupId) return;
    try {
      await addMember.mutateAsync({ groupId, userId });
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    try {
      await removeMember.mutateAsync({ groupId, userId });
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleDirectMessage = async (userId: string) => {
    try {
      const conversation = await createDirectMessage.mutateAsync(userId);
      onSelectUser?.(conversation.id);
    } catch (error) {
      console.error('Failed to create direct message:', error);
    }
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Current Members (if in group context) */}
      {groupId && groupMembers && groupMembers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Current Members ({groupMembers.length})</h4>
          <ScrollArea className="h-32 border rounded-md p-2">
            <div className="space-y-2">
              {groupMembers.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user_profile?.avatar_url} />
                      <AvatarFallback>
                        {getUserInitials(member.user_profile?.full_name, member.user_profile?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {member.user_profile?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.role}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removeMember.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Available Users */}
      <div>
        <h4 className="text-sm font-medium mb-2">
          {groupId ? 'Add Members' : 'All Users'} ({filteredUsers.length})
        </h4>
        <ScrollArea className="h-64 border rounded-md p-2">
          <div className="space-y-2">
            {filteredUsers.map(user => {
              const isMember = memberUserIds.has(user.user_id);
              
              return (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {getUserInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                    {user.role && (
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    )}
                    {isMember && (
                      <Badge variant="default" className="text-xs">
                        Member
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {showDirectMessage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDirectMessage(user.user_id)}
                        disabled={createDirectMessage.isPending}
                        title="Send direct message"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {groupId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => isMember ? handleRemoveMember(user.user_id) : handleAddMember(user.user_id)}
                        disabled={addMember.isPending || removeMember.isPending}
                      >
                        {isMember ? (
                          <UserMinus className="h-4 w-4 text-destructive" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching "{searchTerm}"
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};