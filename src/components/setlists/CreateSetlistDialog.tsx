import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSetlists } from '@/hooks/useSetlists';

interface CreateSetlistDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSetlistDialog: React.FC<CreateSetlistDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { createSetlist } = useSetlists();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      await createSetlist({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_public: formData.is_public,
      });
      
      // Reset form and close
      setFormData({
        name: '',
        description: '',
        is_public: false,
      });
      onClose();
    } catch (error) {
      console.error('Error creating setlist:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Setlist</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Setlist Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Spring Concert 2024"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description of the setlist..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => handleInputChange('is_public', checked)}
            />
            <Label htmlFor="is_public">Make this setlist public</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Setlist'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};