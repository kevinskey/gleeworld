import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onMembersAdded: () => void;
}

interface User {
  user_id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}

export const AddMembersDialog: React.FC<AddMembersDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  onMembersAdded,
}) => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
      setSelectedUserIds([]);
      setSearchQuery('');
    }
  }, [open, groupId]);

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);

      // Get current group members
      const { data: currentMembers, error: membersError } = await supabase
        .from('gw_group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      const currentMemberIds = currentMembers?.map(m => m.user_id) || [];

      // Get all users who are not in the group
      const { data: users, error: usersError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, avatar_url')
        .not('user_id', 'in', `(${currentMemberIds.join(',') || 'null'})`)
        .order('full_name');

      if (usersError) throw usersError;

      setAvailableUsers(users || []);
    } catch (error: any) {
      console.error('Error fetching available users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setAdding(true);

      const membersToAdd = selectedUserIds.map(userId => ({
        group_id: groupId,
        user_id: userId,
        role: 'member',
      }));

      const { error } = await supabase
        .from('gw_group_members')
        .insert(membersToAdd);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Added ${selectedUserIds.length} member${selectedUserIds.length > 1 ? 's' : ''} to the group`,
      });

      onMembersAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding members:', error);
      toast({
        title: 'Error',
        description: 'Failed to add members to the group',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] pb-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Add Members to Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users found' : 'No available users to add'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleToggleUser(user.user_id)}
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(user.user_id)}
                      onCheckedChange={() => handleToggleUser(user.user_id)}
                    />
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.full_name}</p>
                      {user.email && (
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-col items-center gap-3 sm:flex-col">
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedUserIds.length === 0 || adding}
            >
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
            </Button>
          </div>
          
          {/* Glee Club Logo Footer - similar to Carl Fischer reference */}
          <div className="w-full border-t pt-3 flex justify-center">
            <img 
              src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
              alt="Spelman College Glee Club"
              className="h-12 object-contain opacity-80"
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
