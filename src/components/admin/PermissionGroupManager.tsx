import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Users, Settings } from 'lucide-react';
import { usePermissionGroups, useGroupPermissions, type PermissionGroup } from '@/hooks/usePermissionGroups';
import { COMPREHENSIVE_FUNCTIONS_LIST, FUNCTION_CATEGORIES } from '@/constants/granularPermissions';

const PERMISSION_LEVELS = [
  { value: 'view', label: 'View', description: 'Can view/read only' },
  { value: 'edit', label: 'Edit', description: 'Can view and modify' },
  { value: 'full', label: 'Full', description: 'Can view, modify, and create' },
  { value: 'admin', label: 'Admin', description: 'Full access including deletion' },
];

const PERMISSION_SCOPES = [
  { value: 'own', label: 'Own Items', description: 'Access to own items only' },
  { value: 'department', label: 'Department', description: 'Access to department items' },
  { value: 'system', label: 'System Wide', description: 'Access to all items system-wide' },
];

const GroupFormDialog = ({ 
  group, 
  open, 
  onOpenChange, 
  onSave 
}: {
  group?: PermissionGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) => {
  const { createGroup, updateGroup } = usePermissionGroups();
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    color: group?.color || '#6366f1',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = group 
      ? await updateGroup(group.id, formData)
      : await createGroup(formData);
    
    if (success) {
      onSave();
      onOpenChange(false);
      setFormData({ name: '', description: '', color: '#6366f1' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit' : 'Create'} Permission Group</DialogTitle>
          <DialogDescription>
            {group ? 'Update the permission group details' : 'Create a new permission group for organizing user permissions'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Executive Board"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the role and responsibilities..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-16 h-10"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="#6366f1"
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {group ? 'Update' : 'Create'} Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PermissionsDialog = ({
  group,
  open,
  onOpenChange
}: {
  group: PermissionGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { permissions, updateGroupPermissions } = useGroupPermissions(group.id);
  const [permissionSettings, setPermissionSettings] = useState<Record<string, {
    enabled: boolean;
    level: string;
    scope: string;
  }>>({});

  React.useEffect(() => {
    if (permissions.length > 0) {
      const settings: Record<string, { enabled: boolean; level: string; scope: string }> = {};
      permissions.forEach(p => {
        settings[p.permission_id] = {
          enabled: true,
          level: p.permission_level,
          scope: p.permission_scope,
        };
      });
      setPermissionSettings(settings);
    }
  }, [permissions]);

  const handleSave = async () => {
    const updates = COMPREHENSIVE_FUNCTIONS_LIST.map(func => ({
      permission_id: func.id,
      permission_level: permissionSettings[func.id]?.level || 'view',
      permission_scope: permissionSettings[func.id]?.scope || 'system',
      enabled: permissionSettings[func.id]?.enabled || false,
    }));

    const success = await updateGroupPermissions(group.id, updates);
    if (success) {
      onOpenChange(false);
    }
  };

  const updatePermission = (permissionId: string, field: string, value: any) => {
    setPermissionSettings(prev => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        [field]: value,
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Configure Permissions for {group.name}</DialogTitle>
          <DialogDescription>
            Set the permission level and scope for each function in this group
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {FUNCTION_CATEGORIES.map(category => (
            <div key={category.name} className="mb-6">
              <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
              <div className="space-y-3">
                {category.functions.map(func => {
                  const setting = permissionSettings[func.id] || { enabled: false, level: 'view', scope: 'system' };
                  return (
                    <div key={func.id} className="flex items-center gap-4 p-3 border rounded-lg bg-background/50">
                      <Checkbox
                        checked={setting.enabled}
                        onCheckedChange={(checked) => updatePermission(func.id, 'enabled', checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{func.name}</h4>
                        <p className="text-sm text-muted-foreground">{func.description}</p>
                      </div>
                      {setting.enabled && (
                        <div className="flex gap-2">
                          <Select
                            value={setting.level}
                            onValueChange={(value) => updatePermission(func.id, 'level', value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              {PERMISSION_LEVELS.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={setting.scope}
                            onValueChange={(value) => updatePermission(func.id, 'scope', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              {PERMISSION_SCOPES.map(scope => (
                                <SelectItem key={scope.value} value={scope.value}>
                                  {scope.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
        </ScrollArea>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const PermissionGroupManager = () => {
  const { groups, loading, deleteGroup } = usePermissionGroups();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [permissionsGroup, setPermissionsGroup] = useState<PermissionGroup | null>(null);

  const handleDelete = async (group: PermissionGroup) => {
    if (group.is_default) {
      alert('Cannot delete default groups');
      return;
    }
    
    if (confirm(`Are you sure you want to delete the "${group.name}" group?`)) {
      await deleteGroup(group.id);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading permission groups...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Permission Groups</h2>
          <p className="text-muted-foreground">
            Create and manage permission groups to organize user access levels
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(group => (
          <Card key={group.id} className="relative">
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
              style={{ backgroundColor: group.color }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  {group.description && (
                    <CardDescription className="mt-1">
                      {group.description}
                    </CardDescription>
                  )}
                </div>
                {group.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingGroup(group)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPermissionsGroup(group)}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Permissions
                  </Button>
                </div>
                {!group.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(group)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <GroupFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={() => {}}
      />

      {editingGroup && (
        <GroupFormDialog
          group={editingGroup}
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
          onSave={() => setEditingGroup(null)}
        />
      )}

      {permissionsGroup && (
        <PermissionsDialog
          group={permissionsGroup}
          open={!!permissionsGroup}
          onOpenChange={(open) => !open && setPermissionsGroup(null)}
        />
      )}
    </div>
  );
};