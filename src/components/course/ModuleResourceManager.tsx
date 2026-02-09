import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X, Library, Music, Video, FileText, Search, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleResourceManagerProps {
  courseId: string;
  moduleId: string;
  weekNumber: number;
  onClose: () => void;
}

export const ModuleResourceManager: React.FC<ModuleResourceManagerProps> = ({
  courseId,
  moduleId,
  weekNumber,
  onClose,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [resourceType, setResourceType] = useState('video');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch media library items for the picker
  const { data: mediaItems, isLoading: mediaLoading } = useQuery({
    queryKey: ['media-library-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, folder_id')
        .in('file_type', ['audio', 'video', 'document', 'image'])
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: pickerOpen,
  });

  const handleAdd = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_module_resources')
        .insert({
          module_id: `week-${weekNumber}`,
          title: title.trim(),
          url: url.trim() || null,
          resource_type: resourceType,
          description: description.trim() || null,
          display_order: 0,
          created_by: user?.id,
        });
      if (error) throw error;
      toast.success('Resource added');
      queryClient.invalidateQueries({ queryKey: ['mus240-module-resources'] });
      setTitle('');
      setUrl('');
      setDescription('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectMedia = (item: { id: string; title: string; file_url: string; file_type: string }) => {
    // Auto-fill the form with the selected media item
    setTitle(item.title.replace(/\.[^/.]+$/, '')); // strip file extension
    setUrl(item.file_url);
    // Map file_type to resource_type
    if (item.file_type === 'audio') setResourceType('listening');
    else if (item.file_type === 'video') setResourceType('video');
    else setResourceType('reading');
    setPickerOpen(false);
    toast.success(`Selected: ${item.title}`);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio': return Music;
      case 'video': return Video;
      default: return FileText;
    }
  };

  const filteredMedia = (mediaItems || []).filter(item => {
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.file_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Add Resource to Week {weekNumber}</h4>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Media Library Picker Button */}
      <Button
        variant="outline"
        className="w-full justify-start gap-2 border-dashed"
        onClick={() => setPickerOpen(true)}
      >
        <Library className="h-4 w-4 text-primary" />
        Browse Media Library (MP3, MP4, documents...)
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          placeholder="Resource title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="listening">Listening</SelectItem>
            <SelectItem value="document">Document</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        placeholder="URL (YouTube, media library link, etc.)"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <Button size="sm" onClick={handleAdd} disabled={saving || !title.trim()}>
        <Plus className="h-4 w-4 mr-1.5" /> Add Resource
      </Button>

      {/* Media Library Picker Dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Select from Media Library
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results */}
            <ScrollArea className="h-[400px]">
              {mediaLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">Loading media...</div>
              ) : filteredMedia.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No {filterType !== 'all' ? filterType : ''} files found
                </div>
              ) : (
                <div className="space-y-1 pr-3">
                  {filteredMedia.map(item => {
                    const Icon = getFileIcon(item.file_type);
                    const isSelected = url === item.file_url;
                    return (
                      <button
                        key={item.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/70 ${
                          isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''
                        }`}
                        onClick={() => handleSelectMedia(item)}
                      >
                        <div className={`flex items-center justify-center w-9 h-9 rounded-md ${
                          item.file_type === 'audio' ? 'bg-purple-100 text-purple-600' :
                          item.file_type === 'video' ? 'bg-blue-100 text-blue-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.file_type}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                        <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{item.file_type}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
