import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RecipientGroup, RECIPIENT_GROUPS } from '@/types/communication';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface GroupManagementProps {
  groups: RecipientGroup[];
  onGroupAdd: (group: RecipientGroup) => void;
  onGroupEdit: (group: RecipientGroup) => void;
  onGroupDelete: (groupId: string) => void;
}

export const GroupManagement = ({
  groups,
  onGroupAdd,
  onGroupEdit,
  onGroupDelete
}: GroupManagementProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RecipientGroup | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    type: 'special' as RecipientGroup['type'],
    query: ''
  });
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!formData.label.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive"
      });
      return;
    }

    const groupData: RecipientGroup = {
      id: editingGroup?.id || formData.label.toLowerCase().replace(/\s+/g, '_'),
      label: formData.label,
      type: formData.type,
      query: formData.query || undefined
    };

    if (editingGroup) {
      onGroupEdit(groupData);
      setEditingGroup(null);
    } else {
      onGroupAdd(groupData);
      setIsAddDialogOpen(false);
    }

    setFormData({ label: '', type: 'special', query: '' });
    toast({
      title: "Success",
      description: `Group ${editingGroup ? 'updated' : 'added'} successfully`
    });
  };

  const handleEdit = (group: RecipientGroup) => {
    setFormData({
      label: group.label,
      type: group.type,
      query: group.query || ''
    });
    setEditingGroup(group);
  };

  const handleDelete = (groupId: string) => {
    onGroupDelete(groupId);
    toast({
      title: "Success",
      description: "Group deleted successfully"
    });
  };

  const getTypeLabel = (type: RecipientGroup['type']) => {
    const labels = {
      'role': 'Role',
      'voice_part': 'Voice Part',
      'academic_year': 'Academic Year',
      'special': 'Special Group'
    };
    return labels[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Recipient Groups
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Recipient Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="group-type">Group Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: RecipientGroup['type']) => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="role">Role</SelectItem>
                      <SelectItem value="voice_part">Voice Part</SelectItem>
                      <SelectItem value="academic_year">Academic Year</SelectItem>
                      <SelectItem value="special">Special Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="group-query">Query (Optional)</Label>
                  <Input
                    id="group-query"
                    value={formData.query}
                    onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                    placeholder="Database query for group members"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  Add Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{group.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(group.type)}
                    </Badge>
                    {group.count && (
                      <span className="text-xs text-muted-foreground">
                        {group.count} members
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Dialog
                  open={editingGroup?.id === group.id}
                  onOpenChange={(open) => !open && setEditingGroup(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(group)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Recipient Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-group-name">Group Name</Label>
                        <Input
                          id="edit-group-name"
                          value={formData.label}
                          onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                          placeholder="Enter group name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-group-type">Group Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: RecipientGroup['type']) => 
                            setFormData(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="role">Role</SelectItem>
                            <SelectItem value="voice_part">Voice Part</SelectItem>
                            <SelectItem value="academic_year">Academic Year</SelectItem>
                            <SelectItem value="special">Special Group</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-group-query">Query (Optional)</Label>
                        <Input
                          id="edit-group-query"
                          value={formData.query}
                          onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                          placeholder="Database query for group members"
                        />
                      </div>
                      <Button onClick={handleSubmit} className="w-full">
                        Update Group
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(group.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};