import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Filter, Grid, List, Search, Tag, Download, Trash2, FileText, Briefcase, Share, Database, BarChart3 } from 'lucide-react';
import { usePRImages, PRImage, PRImageTag } from '@/hooks/usePRImages';
import { PRImageGallery } from './PRImageGallery';
import { PRQuickCapture } from './PRQuickCapture';
import { PRImageDetails } from './PRImageDetails';
import { PRBulkActions } from './PRBulkActions';
import { PRTagManager } from './PRTagManager';
import { PressKitManager } from './PressKitManager';
import { PRDataManager } from './PRDataManager';
import { PRMetadataExporter } from './PRMetadataExporter';
import PressKitTemplateGenerator from './PressKitTemplateGenerator';
import { TaskNotifications } from '@/components/shared/TaskNotifications';

export const PRCoordinatorHub = () => {
  const {
    images,
    tags,
    loading,
    uploadImage,
    deleteImage,
    updateImageTags,
    getImageUrl,
    refreshImages,
    refreshTags,
  } = usePRImages();

  console.log('PRCoordinatorHub: Component rendered with:', { 
    imagesCount: images.length, 
    loading, 
    images: images.slice(0, 2) // Show first 2 images for debugging
  });

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<PRImage | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showQuickCapture, setShowQuickCapture] = useState(false);

  // Debug showQuickCapture state changes
  useEffect(() => {
    console.log('PRCoordinatorHub: showQuickCapture state changed to:', showQuickCapture);
  }, [showQuickCapture]);

  const filteredImages = images.filter(image => {
    const matchesSearch = !searchQuery || 
      image.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.caption?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tagId => 
        image.tags?.some(tag => tag.id === tagId)
      );

    return matchesSearch && matchesTags;
  });

  const handleImageSelect = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img.id));
    }
  };

  // Listen for header camera trigger
  useEffect(() => {
    const handleQuickCapture = () => {
      console.log('PRCoordinatorHub: Received trigger-pr-quick-capture event');
      setShowQuickCapture(true);
      console.log('PRCoordinatorHub: Set showQuickCapture to true');
    };

    console.log('PRCoordinatorHub: Adding event listener for trigger-pr-quick-capture');
    window.addEventListener('trigger-pr-quick-capture', handleQuickCapture);
    return () => {
      console.log('PRCoordinatorHub: Removing event listener for trigger-pr-quick-capture');
      window.removeEventListener('trigger-pr-quick-capture', handleQuickCapture);
    };
  }, []);

  const handleTagFilter = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">PR Coordinator Hub</h1>
          <p className="text-muted-foreground">Manage and organize member photos for publicity</p>
        </div>
        <div className="flex gap-3 items-center">
          <TaskNotifications />
          <Button 
            onClick={() => {
              console.log('Manual refresh triggered');
              refreshImages();
              refreshTags();
            }} 
            variant="outline" 
            className="gap-2"
          >
            Refresh
          </Button>
          <Button onClick={() => {
            console.log('PR Quick Capture button clicked');
            console.log('Current showQuickCapture state:', showQuickCapture);
            console.log('Setting showQuickCapture to true');
            setShowQuickCapture(true);
          }} className="gap-2">
            <Camera className="h-4 w-4" />
            Quick Capture
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedImages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {images.filter(img => img.is_featured).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gallery" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="data-manager">Data Manager</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="press-kits">Press Kits</TabsTrigger>
          <TabsTrigger value="ai-templates">AI Templates</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-4">
          {/* Filters and Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search images..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-64"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagFilter(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  {selectedImages.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {selectedImages.length === filteredImages.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </div>

              {selectedTags.length > 0 && (
                <div className="mt-3 flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {selectedTags.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    return tag ? (
                      <Badge key={tag.id} variant="secondary" className="gap-1">
                        {tag.name}
                        <button
                          onClick={() => handleTagFilter(tag.id)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Gallery */}
          <PRImageGallery
            images={filteredImages}
            selectedImages={selectedImages}
            viewMode={viewMode}
            loading={loading}
            onImageSelect={handleImageSelect}
            onImageClick={setSelectedImage}
            onImageDelete={deleteImage}
            getImageUrl={getImageUrl}
          />
        </TabsContent>

        <TabsContent value="data-manager">
          <PRDataManager />
        </TabsContent>

        <TabsContent value="export">
          <PRMetadataExporter />
        </TabsContent>

        <TabsContent value="press-kits">
          <PressKitManager />
        </TabsContent>

        <TabsContent value="ai-templates">
          <PressKitTemplateGenerator />
        </TabsContent>

        <TabsContent value="tags">
          <PRTagManager
            tags={tags}
            onTagsUpdate={refreshTags}
          />
        </TabsContent>

        <TabsContent value="bulk">
          <PRBulkActions
            selectedImages={selectedImages}
            images={images}
            tags={tags}
            onAction={() => {
              setSelectedImages([]);
              refreshImages();
            }}
            onDelete={deleteImage}
            onUpdateTags={updateImageTags}
            getImageUrl={getImageUrl}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Capture Modal */}
      {showQuickCapture && (
        <PRQuickCapture
          tags={tags}
          onClose={() => setShowQuickCapture(false)}
          onCapture={uploadImage}
        />
      )}

      {/* Image Details Modal */}
      {selectedImage && (
        <PRImageDetails
          image={selectedImage}
          tags={tags}
          onClose={() => setSelectedImage(null)}
          onDelete={deleteImage}
          onUpdateTags={updateImageTags}
          getImageUrl={getImageUrl}
        />
      )}
    </div>
  );
};