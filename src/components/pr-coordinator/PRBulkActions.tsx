import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { PRImage, PRImageTag } from '@/hooks/usePRImages';
import { Download, Trash2, Tag, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PRBulkActionsProps {
  selectedImages: string[];
  images: PRImage[];
  tags: PRImageTag[];
  onAction: () => void;
  onDelete: (imageId: string) => Promise<void>;
  onUpdateTags: (imageId: string, tagIds: string[]) => Promise<void>;
}

export const PRBulkActions = ({
  selectedImages,
  images,
  tags,
  onAction,
  onDelete,
  onUpdateTags,
}: PRBulkActionsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { toast } = useToast();

  const selectedImageData = images.filter(img => selectedImages.includes(img.id));

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedImages.length} image(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await Promise.all(selectedImages.map(id => onDelete(id)));
      
      toast({
        title: "Success",
        description: `Deleted ${selectedImages.length} image(s) successfully`,
      });

      onAction();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some images",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedImages.length === 0 || selectedTags.length === 0) return;

    setIsProcessing(true);
    try {
      await Promise.all(
        selectedImages.map(async (imageId) => {
          const currentImage = images.find(img => img.id === imageId);
          const currentTagIds = currentImage?.tags?.map(tag => tag.id) || [];
          const newTagIds = [...new Set([...currentTagIds, ...selectedTags])];
          return onUpdateTags(imageId, newTagIds);
        })
      );

      toast({
        title: "Success",
        description: `Added tags to ${selectedImages.length} image(s) successfully`,
      });

      setSelectedTags([]);
      onAction();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add tags to some images",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImages.length === 0) return;

    try {
      // Note: In a real implementation, you would want to create a zip file
      // For now, we'll download images individually
      for (const imageId of selectedImages) {
        const image = images.find(img => img.id === imageId);
        if (image) {
          // Create download link
          const response = await fetch(`/api/storage/pr-images/${image.file_path}`);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = image.original_filename || `image-${image.id}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      }

      toast({
        title: "Success",
        description: `Downloaded ${selectedImages.length} image(s)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download some images",
        variant: "destructive",
      });
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (selectedImages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No images selected</h3>
          <p className="text-muted-foreground">
            Select one or more images from the gallery to perform bulk operations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Selected Images ({selectedImages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Total Size</Label>
              <div className="font-medium">
                {(selectedImageData.reduce((sum, img) => sum + (img.file_size || 0), 0) / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Featured</Label>
              <div className="font-medium">
                {selectedImageData.filter(img => img.is_featured).length}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">With Tags</Label>
              <div className="font-medium">
                {selectedImageData.filter(img => img.tags && img.tags.length > 0).length}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Date Range</Label>
              <div className="font-medium text-sm">
                {selectedImageData.length > 1 ? 'Multiple dates' : 'Single image'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tag Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Add Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select tags to add to all selected images</Label>
              <div className="flex flex-wrap gap-2 mt-2">
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
                <p className="text-sm text-muted-foreground mt-2">
                  No tags available. Create tags in the Tag Management section.
                </p>
              )}
            </div>

            <Button
              onClick={handleBulkAddTags}
              disabled={selectedTags.length === 0 || isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Adding tags...' : `Add Tags to ${selectedImages.length} Image(s)`}
            </Button>
          </CardContent>
        </Card>

        {/* Other Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={handleBulkDownload}
              className="w-full gap-2"
              disabled={isProcessing}
            >
              <Download className="h-4 w-4" />
              Download Selected ({selectedImages.length})
            </Button>

            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="w-full gap-2"
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" />
              {isProcessing ? 'Deleting...' : `Delete Selected (${selectedImages.length})`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Selected Images Preview */}
      {selectedImageData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Images Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {selectedImageData.slice(0, 12).map((image) => (
                <div key={image.id} className="aspect-square">
                  <img
                    src={`/api/storage/pr-images/${image.file_path}`}
                    alt={image.original_filename || 'Selected image'}
                    className="w-full h-full object-cover rounded border"
                  />
                </div>
              ))}
              {selectedImageData.length > 12 && (
                <div className="aspect-square bg-muted rounded border flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    +{selectedImageData.length - 12}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
