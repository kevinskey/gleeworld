import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Music, Video, Image, Link2, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useLiturgicalMedia } from '@/hooks/useLiturgicalWeeks';

interface PlannerMediaTabProps {
  weekId: string;
  isAdmin?: boolean;
}

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF Document', icon: FileText },
  { value: 'audio', label: 'Audio (MP3)', icon: Music },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'score', label: 'Music Score (OSMD)', icon: Music },
  { value: 'youtube', label: 'YouTube Link', icon: Video },
  { value: 'link', label: 'External Link', icon: Link2 },
];

const getFileIcon = (type: string | null) => {
  const fileType = FILE_TYPES.find(f => f.value === type);
  return fileType?.icon || FileText;
};

const getFileTypeLabel = (type: string | null) => {
  const fileType = FILE_TYPES.find(f => f.value === type);
  return fileType?.label || 'File';
};

export const PlannerMediaTab: React.FC<PlannerMediaTabProps> = ({ weekId, isAdmin = false }) => {
  const { media, loading, addMedia, deleteMedia } = useLiturgicalMedia(weekId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    file_type: '',
    label: '',
    url: '',
  });

  const resetForm = () => {
    setFormData({ file_type: '', label: '', url: '' });
  };

  const handleSave = async () => {
    await addMedia(formData);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this media item?')) {
      await deleteMedia(id);
    }
  };

  const openUrl = (url: string | null) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading media...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Media & Resources
        </h3>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Media
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Media</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.file_type}
                    onValueChange={(value) => setFormData({ ...formData, file_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select file type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Entrance Hymn PDF"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!formData.file_type || !formData.url}>
                  Add Media
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {media.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {media.map((item) => {
            const Icon = getFileIcon(item.file_type);
            return (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => openUrl(item.url)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {item.label || 'Untitled'}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {getFileTypeLabel(item.file_type)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openUrl(item.url);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No media attached</p>
            <p className="text-muted-foreground mb-4">
              Add PDFs, audio files, music scores, and other resources for this Sunday.
            </p>
            {isAdmin && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Media
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
