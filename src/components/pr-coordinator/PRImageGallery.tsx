import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PRImage } from '@/hooks/usePRImages';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Calendar, User, Image as ImageIcon, Star, Trash2, Edit, Download, Eye, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PRImageGalleryProps {
  images: PRImage[];
  selectedImages: string[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  onImageSelect: (imageId: string) => void;
  onImageClick: (image: PRImage) => void;
  onImageDelete?: (imageId: string) => Promise<void>;
  getImageUrl: (filePath: string) => string;
}

export const PRImageGallery = ({
  images,
  selectedImages,
  viewMode,
  loading,
  onImageSelect,
  onImageClick,
  onImageDelete,
  getImageUrl,
}: PRImageGalleryProps) => {
  const { toast } = useToast();

  const handleQuickDelete = async (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    if (!onImageDelete) return;
    
    if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      try {
        await onImageDelete(imageId);
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

  const handleDownload = (e: React.MouseEvent, image: PRImage) => {
    e.stopPropagation();
    const imageUrl = getImageUrl(image.file_path);
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = image.original_filename || 'pr-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading images..." />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No images found</h3>
          <p className="text-muted-foreground">
            Start by capturing some photos or adjust your filters
          </p>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {images.map((image) => {
          const isVideo = image.mime_type?.startsWith('video/');
          const displayUrl = isVideo && image.thumbnail_url ? image.thumbnail_url : getImageUrl(image.file_path);
          
          return (
            <Card key={image.id} className="group overflow-hidden">
              <div className="relative">
                <img
                  src={displayUrl}
                  alt={image.original_filename || 'PR Media'}
                  className="w-full h-48 object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => onImageClick(image)}
                />
                
                {/* Video Icon Overlay */}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="bg-white/90 rounded-full p-3">
                      <Video className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                )}
                
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={selectedImages.includes(image.id)}
                    onCheckedChange={() => onImageSelect(image.id)}
                    className="bg-background"
                  />
                </div>

                {/* Featured Badge */}
                {image.is_featured && (
                  <Badge className="absolute top-2 right-2 gap-1">
                    <Star className="h-3 w-3" />
                    Featured
                  </Badge>
                )}

                {/* Action Buttons */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick(image);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0"
                    onClick={(e) => handleDownload(e, image)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {onImageDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 w-7 p-0"
                      onClick={(e) => handleQuickDelete(e, image.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Tags */}
                {image.tags && image.tags.length > 0 && (
                  <div className="absolute bottom-2 left-2 flex gap-1 max-w-[calc(100%-4rem)]">
                    {image.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                    {image.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{image.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <CardContent className="p-3">
                <div className="text-sm font-medium truncate mb-1">
                  {image.original_filename || 'Untitled'}
                </div>
                
                {image.caption && (
                  <div className="text-xs text-muted-foreground truncate mb-2">
                    {image.caption}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(image.uploaded_at), { addSuffix: true })}</span>
                  {image.photographer?.full_name && (
                    <span className="truncate ml-2">by {image.photographer.full_name}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {images.map((image) => {
        const isVideo = image.mime_type?.startsWith('video/');
        const displayUrl = isVideo && image.thumbnail_url ? image.thumbnail_url : getImageUrl(image.file_path);
        
        return (
          <Card key={image.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="relative">
                  <img
                    src={displayUrl}
                    alt={image.original_filename || 'PR Media'}
                    className="w-24 h-24 object-cover rounded cursor-pointer"
                    onClick={() => onImageClick(image)}
                  />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none rounded">
                      <div className="bg-white/90 rounded-full p-2">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                  <div className="absolute -top-2 -left-2">
                    <Checkbox
                      checked={selectedImages.includes(image.id)}
                      onCheckedChange={() => onImageSelect(image.id)}
                    />
                  </div>
                </div>

              {/* Details */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">
                      {image.original_filename || 'Untitled'}
                      {image.is_featured && (
                        <Star className="inline-block h-4 w-4 text-yellow-500 ml-2" />
                      )}
                    </h3>
                    {image.caption && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {image.caption}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageClick(image);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleDownload(e, image)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {onImageDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleQuickDelete(e, image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(image.uploaded_at), { addSuffix: true })}
                  </div>
                  
                  {image.photographer?.full_name && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {image.photographer.full_name}
                    </div>
                  )}

                  {image.file_size && (
                    <div>
                      {(image.file_size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  )}
                </div>

                {image.tags && image.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {image.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};