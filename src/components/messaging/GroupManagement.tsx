import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Settings, Trash2, Users, UserPlus } from 'lucide-react';
import { useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/hooks/useMessaging';
import { MessageGroup } from '@/hooks/useMessaging';
import { UserSelector } from './UserSelector';

interface GroupManagementProps {
  group?: MessageGroup;
  onClose?: () => void;
}

export const CreateGroupDialog: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_type: 'general' as const,
    is_private: false
  });
  const createGroup = useCreateGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGroup.mutateAsync(formData);
      setFormData({ name: '', description: '', group_type: 'general', is_private: false });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter group name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Group Type</Label>
            <Select 
              value={formData.group_type} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, group_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="voice_section">Voice Section</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="private"
              checked={formData.is_private}
              onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="private">Private Group</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const EditGroupDialog: React.FC<GroupManagementProps> = ({ group, onClose }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    group_type: group?.group_type || 'general',
    is_private: group?.is_private || false
  });
  const updateGroup = useUpdateGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    
    try {
      await updateGroup.mutateAsync({ groupId: group.id, ...formData });
      setOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Edit Group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter group name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Group Type</Label>
            <Select 
              value={formData.group_type} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, group_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="voice_section">Voice Section</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="private"
              checked={formData.is_private}
              onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="private">Private Group</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateGroup.isPending}>
              {updateGroup.isPending ? 'Updating...' : 'Update Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteGroupDialog: React.FC<GroupManagementProps> = ({ group, onClose }) => {
  const [open, setOpen] = useState(false);
  const deleteGroup = useDeleteGroup();

  const handleDelete = async () => {
    if (!group) return;
    
    try {
      await deleteGroup.mutateAsync(group.id);
      setOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete Group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{group?.name}"? This action cannot be undone and will remove all messages in this group.
          </p>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ManageMembersDialog: React.FC<GroupManagementProps> = ({ group }) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Members - {group?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <UserSelector groupId={group?.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};