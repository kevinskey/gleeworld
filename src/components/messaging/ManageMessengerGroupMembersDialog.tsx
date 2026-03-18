import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManageGroup {
  id: string;
  name: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface SearchUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface ManageMessengerGroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ManageGroup | null;
  onMembersUpdated: () => void;
}

export const ManageMessengerGroupMembersDialog: React.FC<ManageMessengerGroupMembersDialogProps> = ({
  open,
  onOpenChange,
  group,
  onMembersUpdated,
}) => {
  const { toast } = useToast();
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('messenger_group_members' as any)
        .select(`
          id,
          user_id,
          gw_profiles!inner(full_name, email, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const mappedMembers = (data || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        full_name: member.gw_profiles?.full_name || 'Unknown',
        email: member.gw_profiles?.email || '',
        avatar_url: member.gw_profiles?.avatar_url,
      }));

      setGroupMembers(mappedMembers);
    } catch (error: any) {
      console.error('Error fetching messenger group members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group members',
        variant: 'destructive',
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const syncMemberCount = async (groupId: string) => {
    const { count } = await supabase
      .from('messenger_group_members' as any)
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (typeof count === 'number') {
      await supabase
        .from('messenger_groups' as any)
        .update({ member_count: count })
        .eq('id', groupId);
    }
  };

  useEffect(() => {
    if (!open || !group) return;

    setMemberSearch('');
    setMemberSearchResults([]);
    fetchGroupMembers(group.id);
  }, [open, group?.id]);

  useEffect(() => {
    if (!open || !group) {
      setMemberSearchResults([]);
      return;
    }

    if (memberSearch.trim().length < 2) {
      setMemberSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingMembers(true);
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, avatar_url')
          .or(`full_name.ilike.%${memberSearch}%,email.ilike.%${memberSearch}%`)
          .order('full_name')
          .limit(12);

        if (error) throw error;

        const existingMemberIds = new Set(groupMembers.map((member) => member.user_id));
        const filteredResults = (data || []).filter((user) => !existingMemberIds.has(user.user_id));
        setMemberSearchResults(filteredResults);
      } catch (error: any) {
        console.error('Error searching users for messenger group:', error);
      } finally {
        setSearchingMembers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [memberSearch, groupMembers, open, group?.id]);

  const handleAddMember = async (userId: string) => {
    if (!group) return;

    try {
      setUpdatingMemberId(userId);

      const { error } = await supabase
        .from('messenger_group_members' as any)
        .insert({
          group_id: group.id,
          user_id: userId,
          role: 'member',
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already in group',
            description: 'That member is already in this group.',
          });
          return;
        }
        throw error;
      }

      await Promise.all([
        fetchGroupMembers(group.id),
        syncMemberCount(group.id),
      ]);

      onMembersUpdated();
      setMemberSearch('');
      setMemberSearchResults([]);

      toast({
        title: 'Member added',
        description: 'Member was added to this group.',
      });
    } catch (error: any) {
      console.error('Error adding messenger group member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (member: GroupMember) => {
    if (!group) return;

    try {
      setUpdatingMemberId(member.id);

      const { error } = await supabase
        .from('messenger_group_members' as any)
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      await Promise.all([
        fetchGroupMembers(group.id),
        syncMemberCount(group.id),
      ]);

      onMembersUpdated();

      toast({
        title: 'Member removed',
        description: `${member.full_name} was removed from this group.`,
      });
    } catch (error: any) {
      console.error('Error removing messenger group member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200000] w-[calc(100vw-1rem)] max-w-2xl overflow-hidden p-0 sm:w-full">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="px-4 pb-3 pt-4 sm:px-6">
            <DialogTitle className="text-xl font-semibold">
              Manage Members — {group?.name || 'Group'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6">
            <div className="space-y-2">
              <Label htmlFor="member-search">Add member</Label>
              <Input
                id="member-search"
                placeholder="Search by name or email"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            {(searchingMembers || memberSearchResults.length > 0 || memberSearch.trim().length >= 2) && (
              <div className="mt-2 rounded-lg border bg-background">
                <ScrollArea className="max-h-40">
                  {searchingMembers ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : memberSearchResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No matching users.</p>
                  ) : (
                    <div className="space-y-1 p-2">
                      {memberSearchResults.map((candidate) => (
                        <div
                          key={candidate.user_id}
                          className="flex items-center gap-3 rounded-md border bg-card p-2"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={candidate.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(candidate.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{candidate.full_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{candidate.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={updatingMemberId === candidate.user_id}
                            onClick={() => handleAddMember(candidate.user_id)}
                          >
                            {updatingMemberId === candidate.user_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            <div className="mb-2 mt-4 flex items-center justify-between">
              <span className="text-sm font-medium">Current members</span>
              <Badge variant="secondary">{groupMembers.length}</Badge>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
              <ScrollArea className="h-full">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : groupMembers.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No members yet.
                  </p>
                ) : (
                  <div className="space-y-2 p-3">
                    {groupMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-lg border bg-card p-3"
                      >
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{member.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={updatingMemberId === member.id}
                          onClick={() => handleRemoveMember(member)}
                          aria-label={`Remove ${member.full_name}`}
                        >
                          {updatingMemberId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="border-t bg-background px-4 py-3 sm:px-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};