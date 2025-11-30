import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PRImage, PRImageTag } from '@/hooks/usePRImages';
import { Download, Trash2, Edit, Save, X, Star, Calendar, User, FileImage } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PRImageDetailsProps {
  image: PRImage;
  tags: PRImageTag[];
  onClose: () => void;
  onDelete: (imageId: string) => Promise<void>;
  onUpdateTags: (imageId: string, tagIds: string[]) => Promise<void>;
  getImageUrl: (filePath: string) => string;
}

export const PRImageDetails = ({
  image,
  tags,
  onClose,
  onDelete,
  onUpdateTags,
  getImageUrl,
}: PRImageDetailsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    image.tags?.map(tag => tag.id) || []
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSaveTags = async () => {
    setIsUpdating(true);
    try {
      await onUpdateTags(image.id, selectedTags);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Image tags updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update image tags",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      try {
        await onDelete(image.id);
        onClose();
        toast({
          title: "Success",
          description: "Image deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete image",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownload = () => {
    const imageUrl = getImageUrl(image.file_path);
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = image.original_filename || 'pr-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              {image.original_filename || 'PR Image Details'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Media Preview */}
          <div className="space-y-4">
            <div className="relative">
              {image.mime_type?.startsWith('video/') ? (
                <video
                  src={getImageUrl(image.file_path)}
                  controls
                  className="w-full rounded-lg border"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={getImageUrl(image.file_path)}
                  alt={image.original_filename || 'PR Image'}
                  className="w-full rounded-lg border"
                />
              )}
              {image.is_featured && (
                <Badge className="absolute top-3 right-3 gap-1">
                  <Star className="h-3 w-3" />
                  Featured
                </Badge>
              )}
            </div>

            {image.caption && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-1">Caption</h4>
                <p className="text-sm text-muted-foreground">{image.caption}</p>
              </div>
            )}
          </div>

          {/* Details and Metadata */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="font-semibold">Image Information</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">File Name</Label>
                  <div className="font-medium">{image.original_filename}</div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">File Size</Label>
                  <div className="font-medium">
                    {image.file_size ? `${(image.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Uploaded</Label>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(image.uploaded_at), { addSuffix: true })}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">MIME Type</Label>
                  <div className="font-medium">{image.mime_type || 'Unknown'}</div>
                </div>
              </div>
            </div>

            {/* Photographer Info */}
            {(image.photographer?.full_name || image.uploader?.full_name) && (
              <div className="space-y-3">
                <h3 className="font-semibold">Credits</h3>
                
                <div className="space-y-2 text-sm">
                  {image.photographer?.full_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-muted-foreground">Photographer:</span>
                      <span className="font-medium">{image.photographer.full_name}</span>
                    </div>
                  )}
                  
                  {image.uploader?.full_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-muted-foreground">Uploaded by:</span>
                      <span className="font-medium">{image.uploader.full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Tags</h3>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" />
                    Edit Tags
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedTags(image.tags?.map(tag => tag.id) || []);
                      }}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveTags}
                      disabled={isUpdating}
                    >
                      <Save className="h-4 w-4" />
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagToggle(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  
                  {tags.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No tags available. Create tags in the Tag Management section.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {image.tags && image.tags.length > 0 ? (
                    image.tags.map(tag => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags assigned</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};