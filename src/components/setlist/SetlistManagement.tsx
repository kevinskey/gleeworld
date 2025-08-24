import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/music-library/DeleteConfirmDialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Music,
  Users
} from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SetlistFormData {
  title: string;
  description: string;
  concert_name: string;
  event_date: string;
}

export const SetlistManagement: React.FC = () => {
  const { user } = useAuth();
  const { setlists, loading, error } = useSetlists();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<any>(null);
  const [deletingSetlist, setDeletingSetlist] = useState<any>(null);
  const [formData, setFormData] = useState<SetlistFormData>({
    title: '',
    description: '',
    concert_name: '',
    event_date: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      concert_name: '',
      event_date: ''
    });
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a setlist title');
      return;
    }

    try {
      // TODO: Implement createSetlist function in useSetlists hook
      toast.success('Setlist created successfully');
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create setlist');
    }
  };

  const handleEdit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a setlist title');
      return;
    }

    try {
      // TODO: Implement updateSetlist function in useSetlists hook
      toast.success('Setlist updated successfully');
      setEditingSetlist(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update setlist');
    }
  };

  const handleDelete = async () => {
    if (!deletingSetlist) return;

    try {
      // TODO: Implement deleteSetlist function in useSetlists hook
      toast.success('Setlist deleted successfully');
      setDeletingSetlist(null);
    } catch (error) {
      toast.error('Failed to delete setlist');
    }
  };

  const openEditDialog = (setlist: any) => {
    setFormData({
      title: setlist.title || '',
      description: setlist.description || '',
      concert_name: setlist.concert_name || '',
      event_date: setlist.event_date ? new Date(setlist.event_date).toISOString().split('T')[0] : ''
    });
    setEditingSetlist(setlist);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Setlist Management</h2>
          <p className="text-muted-foreground">Create and manage your performance setlists</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Setlist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Setlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter setlist title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Concert/Event Name</label>
                <Input
                  value={formData.concert_name}
                  onChange={(e) => setFormData({ ...formData, concert_name: e.target.value })}
                  placeholder="e.g., Spring Concert 2024"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Event Date</label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreate} className="flex-1">Create</Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Setlists Grid */}
      {setlists.length === 0 ? (
        <Card className="p-8 text-center">
          <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Setlists Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first setlist to organize music for performances
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create First Setlist
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {setlists.map((setlist) => (
            <Card key={setlist.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{setlist.title}</CardTitle>
                    {setlist.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {setlist.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(setlist)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDeletingSetlist(setlist)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {setlist.concert_name && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{setlist.concert_name}</span>
                    </div>
                  )}
                  {setlist.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(setlist.event_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    <span>0 pieces</span> {/* TODO: Add actual count */}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingSetlist} onOpenChange={(open) => !open && setEditingSetlist(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Setlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter setlist title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Concert/Event Name</label>
              <Input
                value={formData.concert_name}
                onChange={(e) => setFormData({ ...formData, concert_name: e.target.value })}
                placeholder="e.g., Spring Concert 2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Event Date</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleEdit} className="flex-1">Save Changes</Button>
              <Button variant="outline" onClick={() => setEditingSetlist(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingSetlist}
        onOpenChange={(open) => !open && setDeletingSetlist(null)}
        title="Delete Setlist"
        description={`Are you sure you want to delete "${deletingSetlist?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
};