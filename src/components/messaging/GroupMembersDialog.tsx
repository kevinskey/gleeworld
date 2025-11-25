import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, UserMinus, Mail, Crown, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddMembersDialog } from './AddMembersDialog';

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  isAdmin?: boolean;
}

interface Member {
  user_id: string;
  full_name: string;
  email?: string;
  profile_image_url?: string;
  role?: string;
  joined_at?: string;
}

export const GroupMembersDialog: React.FC<GroupMembersDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  groupName,
  isAdmin = false,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, groupId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Get group members with their profiles
      const { data: groupMembers, error: membersError } = await supabase
        .from('gw_group_members')
        .select(`
          user_id,
          role,
          joined_at,
          gw_profiles!inner (
            user_id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      if (groupMembers) {
        const formattedMembers = groupMembers.map((gm: any) => ({
          user_id: gm.user_id,
          full_name: gm.gw_profiles.full_name,
          email: gm.gw_profiles.email,
          profile_image_url: gm.gw_profiles.avatar_url,
          role: gm.role,
          joined_at: gm.joined_at,
        }));
        setMembers(formattedMembers);
      }
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      // Remove member from group
      const { error: deleteError } = await supabase
        .from('gw_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Success',
        description: 'Member removed from group',
      });

      fetchMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const filteredMembers = members.filter(member =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {groupName} Members ({members.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {isAdmin && (
              <Button 
                size="icon" 
                variant="outline"
                onClick={() => setShowAddDialog(true)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No members found
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={member.profile_image_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{member.full_name}</p>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 flex-shrink-0">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {member.role === 'moderator' && (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 flex-shrink-0">
                              <Shield className="h-3 w-3 mr-1" />
                              Mod
                            </Badge>
                          )}
                        </div>
                        {member.email && (
                          <p className="text-sm text-muted-foreground truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                      {isAdmin && member.role !== 'admin' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeMember(member.user_id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>

      <AddMembersDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        groupId={groupId}
        onMembersAdded={fetchMembers}
      />
    </Dialog>
  );
};
