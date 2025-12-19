import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  MessageSquare, 
  Settings,
  UserPlus,
  X,
  Loader2,
  Mail,
  Smartphone,
} from 'lucide-react';
import { SignatureSettings } from '@/components/messenger/SignatureSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessengerGroup {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_official: boolean;
  member_count: number;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
}

export const MessengerAdminModule: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState<MessengerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MessengerGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    is_official: true
  });
  const [saving, setSaving] = useState(false);

  // Member search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messenger_groups' as any)
        .select('id, name, description, is_active, member_count, created_at')
        .order('name');
      
      if (error) throw error;
      setGroups((data || []).map((g: any) => ({ ...g, is_official: true })));
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      toast({ title: 'Error', description: 'Failed to load groups', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('messenger_group_members' as any)
        .select(`
          id,
          user_id,
          role,
          gw_profiles!inner(full_name, email, phone_number)
        `)
        .eq('group_id', groupId);
      
      if (error) throw error;
      
      const members = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        full_name: m.gw_profiles?.full_name || 'Unknown',
        email: m.gw_profiles?.email || '',
        phone_number: m.gw_profiles?.phone_number,
        role: m.role
      }));
      
      setGroupMembers(members);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      toast({ title: 'Error', description: 'Failed to load group members', variant: 'destructive' });
    } finally {
      setLoadingMembers(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setMemberSearchResults([]);
      return;
    }
    
    try {
      setSearchingMembers(true);
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, phone_number')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;
      
      // Filter out users already in the group
      const existingIds = groupMembers.map(m => m.user_id);
      const filtered = (data || []).filter(u => !existingIds.includes(u.user_id));
      setMemberSearchResults(filtered);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchingMembers(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => searchUsers(memberSearch), 300);
    return () => clearTimeout(debounce);
  }, [memberSearch, groupMembers]);

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Group name is required', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('messenger_groups' as any)
        .insert({
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active,
          member_count: 0
        });
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Group created successfully' });
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', is_active: true, is_official: true });
      fetchGroups();
    } catch (err: any) {
      console.error('Error creating group:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formData.name.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('messenger_groups' as any)
        .update({
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active
        })
        .eq('id', selectedGroup.id);
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Group updated successfully' });
      setShowEditDialog(false);
      setSelectedGroup(null);
      fetchGroups();
    } catch (err: any) {
      console.error('Error updating group:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('messenger_groups' as any)
        .delete()
        .eq('id', selectedGroup.id);
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Group deleted successfully' });
      setShowDeleteDialog(false);
      setSelectedGroup(null);
      fetchGroups();
    } catch (err: any) {
      console.error('Error deleting group:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('messenger_group_members' as any)
        .insert({
          group_id: selectedGroup.id,
          user_id: userId,
          role: 'member'
        });
      
      if (error) throw error;
      
      // Update member count
      await supabase
        .from('messenger_groups' as any)
        .update({ member_count: (selectedGroup.member_count || 0) + 1 })
        .eq('id', selectedGroup.id);
      
      toast({ title: 'Success', description: 'Member added to group' });
      setMemberSearch('');
      setMemberSearchResults([]);
      fetchGroupMembers(selectedGroup.id);
      fetchGroups();
    } catch (err: any) {
      console.error('Error adding member:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('messenger_group_members' as any)
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      // Update member count
      await supabase
        .from('messenger_groups' as any)
        .update({ member_count: Math.max(0, (selectedGroup.member_count || 0) - 1) })
        .eq('id', selectedGroup.id);
      
      toast({ title: 'Success', description: 'Member removed from group' });
      fetchGroupMembers(selectedGroup.id);
      fetchGroups();
    } catch (err: any) {
      console.error('Error removing member:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (group: MessengerGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      is_active: group.is_active,
      is_official: group.is_official
    });
    setShowEditDialog(true);
  };

  const openMembersDialog = (group: MessengerGroup) => {
    setSelectedGroup(group);
    setGroupMembers([]);
    setMemberSearch('');
    setMemberSearchResults([]);
    fetchGroupMembers(group.id);
    setShowMembersDialog(true);
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Messenger Admin</h2>
          <p className="text-muted-foreground">Manage messenger groups and communication settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4 mt-4">
          {/* Header with search and create */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => {
              setFormData({ name: '', description: '', is_active: true, is_official: true });
              setShowCreateDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>

          {/* Groups list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No groups match your search' : 'No groups created yet'}
                </p>
                {!searchQuery && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Create your first group
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {group.name}
                          {!group.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </CardTitle>
                        {group.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {group.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{group.member_count || 0} members</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openMembersDialog(group)}
                          title="Manage members"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(group)}
                          title="Edit group"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedGroup(group);
                            setShowDeleteDialog(true);
                          }}
                          title="Delete group"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>Configure email delivery preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Default sender name</Label>
                  <p className="text-sm text-muted-foreground">Name shown in recipient's inbox</p>
                </div>
                <Input className="max-w-xs" placeholder="GleeWorld" defaultValue="GleeWorld" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Include branding footer</Label>
                  <p className="text-sm text-muted-foreground">Add Glee Club branding to all emails</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                SMS Settings
              </CardTitle>
              <CardDescription>Configure SMS delivery preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">SMS notifications enabled</Label>
                  <p className="text-sm text-muted-foreground">Allow sending SMS to members</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Character limit warning</Label>
                  <p className="text-sm text-muted-foreground">Warn when SMS exceeds 160 characters</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <SignatureSettings />
        </TabsContent>
      </Tabs>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a messenger group to organize recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                placeholder="e.g., Executive Board"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this group..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Show in messenger group list</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update group details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                placeholder="e.g., Executive Board"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this group..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Show in messenger group list</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedGroup?.name}"? This will also remove all member associations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Members - {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Add or remove members from this group
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Add member search */}
            <div className="space-y-2">
              <Label>Add Member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-10"
                />
                {memberSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {memberSearchResults.map((user) => (
                      <button
                        key={user.user_id}
                        onClick={() => handleAddMember(user.user_id)}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-sm text-muted-foreground ml-2">{user.email}</span>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Current members */}
            <div className="space-y-2">
              <Label>Current Members ({groupMembers.length})</Label>
              <ScrollArea className="h-64 border rounded-lg">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : groupMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mb-2" />
                    <p>No members in this group</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {groupMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{member.full_name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{member.email}</span>
                            {member.phone_number && (
                              <span className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                {member.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowMembersDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessengerAdminModule;
