import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePressKits } from '@/hooks/usePressKits';
import { FileText, Image, Music, Video, User, Users } from 'lucide-react';

interface PressKitCreateDialogProps {
  onClose: () => void;
}

export const PressKitCreateDialog = ({ onClose }: PressKitCreateDialogProps) => {
  const { createPressKit } = usePressKits();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template_type: 'general',
    is_public: false,
  });

  const templateTypes = [
    { value: 'general', label: 'General Press Kit', icon: FileText },
    { value: 'concert', label: 'Concert/Performance', icon: Music },
    { value: 'tour', label: 'Tour Announcement', icon: Users },
    { value: 'album', label: 'Album Release', icon: Music },
    { value: 'event', label: 'Special Event', icon: Video },
    { value: 'bio', label: 'Artist Biography', icon: User },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await createPressKit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating press kit:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTemplate = templateTypes.find(t => t.value === formData.template_type);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Press Kit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter press kit title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this press kit"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Template Type</Label>
            <Select
              value={formData.template_type}
              onValueChange={(value) => setFormData({ ...formData, template_type: value })}
            >
              <SelectTrigger>
                <SelectValue>
                  {selectedTemplate && (
                    <div className="flex items-center gap-2">
                      <selectedTemplate.icon className="h-4 w-4" />
                      {selectedTemplate.label}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templateTypes.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    <div className="flex items-center gap-2">
                      <template.icon className="h-4 w-4" />
                      {template.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Make Public</Label>
              <p className="text-sm text-muted-foreground">
                Allow public access to this press kit
              </p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !formData.title.trim()}>
              {isCreating ? 'Creating...' : 'Create Press Kit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};