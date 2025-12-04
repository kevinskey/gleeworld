import { useState, useEffect } from 'react';
import { MediaFile } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Download, 
  Trash2, 
  Star, 
  Edit2, 
  Eye,
  Image,
  Video,
  Music,
  FileText,
  File,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FinderInspectorProps {
  file: MediaFile;
  onClose: () => void;
  onPreview: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  getFileType: (file: MediaFile) => string;
}

export const FinderInspector = ({
  file,
  onClose,
  onPreview,
  onRefresh,
  isAdmin,
  getFileType
}: FinderInspectorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(file.title || '');
  const { toast } = useToast();

  // Update title when file changes
  useEffect(() => {
    setTitle(file.title || '');
    setIsEditing(false);
  }, [file.id, file.title]);

  // Encode URL to handle special characters
  const encodeFileUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      urlObj.pathname = urlObj.pathname
        .split('/')
        .map(segment => {
          let encoded = encodeURIComponent(decodeURIComponent(segment));
          encoded = encoded.replace(/!/g, '%21');
          encoded = encoded.replace(/'/g, '%27');
          encoded = encoded.replace(/\(/g, '%28');
          encoded = encoded.replace(/\)/g, '%29');
          return encoded;
        })
        .join('/');
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  const encodedUrl = encodeFileUrl(file.file_url);
  const fileType = getFileType(file);

  const getIcon = () => {
    switch (fileType) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return File;
    }
  };

  const Icon = getIcon();

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleSave = async () => {
    try {
      const table = (file as any).source === 'quick_capture' ? 'quick_capture_media' : 'gw_media_library';
      const { error } = await supabase
        .from(table)
        .update({ title })
        .eq('id', file.id);

      if (error) throw error;

      toast({ title: "File renamed" });
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const table = (file as any).source === 'quick_capture' ? 'quick_capture_media' : 'gw_media_library';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', file.id);

      if (error) throw error;

      toast({ title: "File deleted" });
      onClose();
      onRefresh();
    } catch (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  return (
    <div className="w-72 border-l border-border bg-muted/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="font-medium text-sm">Info</span>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview */}
      <div className="p-4">
        <div 
          className="aspect-square rounded-lg overflow-hidden bg-muted mb-4 cursor-pointer relative group"
          onClick={onPreview}
        >
          {fileType === 'image' ? (
            <img src={encodedUrl} alt={file.title} className="w-full h-full object-cover" />
          ) : fileType === 'video' ? (
            <div className="w-full h-full relative">
              {file.thumbnail_url ? (
                <img src={encodeFileUrl(file.thumbnail_url)} alt={file.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-500/10">
                  <Video className="h-16 w-16 text-purple-500" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-12 w-12 text-white fill-white" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Title */}
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <h3 className="font-medium text-foreground flex-1 break-words">{file.title || 'Untitled'}</h3>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 w-6 p-0 flex-shrink-0">
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {file.category && (
          <Badge variant="secondary" className="mt-2 text-xs">
            {file.category}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Metadata */}
      <div className="p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span className="capitalize">{fileType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Size</span>
          <span>{formatSize(file.file_size)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created</span>
          <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
        </div>
        {file.duration_seconds && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span>{Math.floor(file.duration_seconds / 60)}:{(file.duration_seconds % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="p-4 space-y-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(encodedUrl, '_blank')}
          className="w-full justify-start"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <Star className="h-4 w-4 mr-2" />
          Add to Favorites
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};
