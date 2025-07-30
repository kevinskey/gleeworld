import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PRImage } from '@/hooks/usePRImages';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Calendar, User, Image as ImageIcon, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PRImageGalleryProps {
  images: PRImage[];
  selectedImages: string[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  onImageSelect: (imageId: string) => void;
  onImageClick: (image: PRImage) => void;
  getImageUrl: (filePath: string) => string;
}

export const PRImageGallery = ({
  images,
  selectedImages,
  viewMode,
  loading,
  onImageSelect,
  onImageClick,
  getImageUrl,
}: PRImageGalleryProps) => {
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
        {images.map((image) => (
          <Card key={image.id} className="group overflow-hidden">
            <div className="relative">
              <img
                src={getImageUrl(image.file_path)}
                alt={image.original_filename || 'PR Image'}
                className="w-full h-48 object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => onImageClick(image)}
              />
              
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

              {/* Tags */}
              {image.tags && image.tags.length > 0 && (
                <div className="absolute bottom-2 left-2 flex gap-1 max-w-[calc(100%-1rem)]">
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
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {images.map((image) => (
        <Card key={image.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="relative">
                <img
                  src={getImageUrl(image.file_path)}
                  alt={image.original_filename || 'PR Image'}
                  className="w-24 h-24 object-cover rounded cursor-pointer"
                  onClick={() => onImageClick(image)}
                />
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

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onImageClick(image)}
                  >
                    View Details
                  </Button>
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
      ))}
    </div>
  );
};