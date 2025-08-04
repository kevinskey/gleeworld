import React, { useState, useEffect } from 'react';
import { Camera, Search, Grid, List, Sparkles, TrendingUp, Star, Filter, RefreshCw, Download, Upload, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePRImages } from '@/hooks/usePRImages';
import { PRImageGallery } from './PRImageGallery';
import { PRImageDetails } from './PRImageDetails';
import { PRQuickCapture } from './PRQuickCapture';
import { PRTagManager } from './PRTagManager';
import { PRBulkActions } from './PRBulkActions';
import { PressKitManager } from './PressKitManager';
import { PRDataManager } from './PRDataManager';
import { PRMetadataExporter } from './PRMetadataExporter';
import PressKitTemplateGenerator from './PressKitTemplateGenerator';
import { TaskNotifications } from '@/components/shared/TaskNotifications';
import { MediaLibraryDialog } from '@/components/radio/MediaLibraryDialog';
import { HeroManagement } from '@/components/admin/HeroManagement';

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
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Debug showQuickCapture state changes
  useEffect(() => {
    console.log('PRCoordinatorHub: showQuickCapture state changed to:', showQuickCapture);
  }, [showQuickCapture]);

  const filteredImages = images.filter(image => {
    const matchesSearch = !searchQuery || 
      image.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.caption?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // For now, disable tag filtering since we need to check the image structure
    const matchesTags = selectedTags.length === 0; // Will be properly implemented based on actual image structure
    
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
    
    // Also check for event on mount in case it was dispatched before listener was added
    setTimeout(() => {
      console.log('PRCoordinatorHub: Checking for pending quick capture trigger');
      // Check if we should trigger quick capture based on URL params or sessionStorage
      const shouldTrigger = sessionStorage.getItem('trigger-pr-quick-capture');
      if (shouldTrigger) {
        console.log('PRCoordinatorHub: Found pending trigger, activating quick capture');
        setShowQuickCapture(true);
        sessionStorage.removeItem('trigger-pr-quick-capture');
      }
    }, 100);
    
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
    <div className="space-y-8 p-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Media Management</h1>
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-lg">
            Organize, manage, and distribute member photos for publicity campaigns
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
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
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowMediaLibrary(true)} 
            variant="outline"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import to Library
          </Button>
          <Button 
            onClick={() => {
              console.log('PR Quick Capture button clicked');
              console.log('Current showQuickCapture state:', showQuickCapture);
              console.log('Setting showQuickCapture to true');
              setShowQuickCapture(true);
            }} 
            className="gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
          >
            <Camera className="h-4 w-4" />
            Quick Capture
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Total Images</CardTitle>
              <Upload className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{images.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{images.filter(img => {
                const today = new Date();
                const imgDate = new Date(img.created_at);
                return imgDate.toDateString() === today.toDateString();
              }).length} today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Selected</CardTitle>
              <Filter className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{selectedImages.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedImages.length > 0 ? 'Ready for bulk actions' : 'No selection'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Featured</CardTitle>
              <Star className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">
              {images.filter(img => img.is_featured).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Highlighted content
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Available Tags</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{tags.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Organization tools
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="gallery" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1 bg-muted/50 p-1">
          <TabsTrigger value="gallery" className="flex items-center gap-2 text-xs md:text-sm">
            <Grid className="w-4 h-4" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="data-manager" className="flex items-center gap-2 text-xs md:text-sm">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2 text-xs md:text-sm">
            <Download className="w-4 h-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="press-kits" className="flex items-center gap-2 text-xs md:text-sm">
            <Zap className="w-4 h-4" />
            Press Kits
          </TabsTrigger>
          <TabsTrigger value="ai-templates" className="flex items-center gap-2 text-xs md:text-sm">
            <Sparkles className="w-4 h-4" />
            AI Tools
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2 text-xs md:text-sm">
            <Filter className="w-4 h-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2 text-xs md:text-sm">
            <Upload className="w-4 h-4" />
            Bulk Actions
          </TabsTrigger>
          <TabsTrigger value="hero-manager" className="flex items-center gap-2 text-xs md:text-sm">
            <Star className="w-4 h-4" />
            Hero Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-6">
          {/* Enhanced Filters and Controls */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                {/* Search and Tag Filters */}
                <div className="flex flex-col xl:flex-row gap-4 items-start">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search images by name or caption..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full bg-background/80 h-10"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap min-w-0">
                    {tags.slice(0, 4).map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer hover:scale-105 transition-transform text-xs whitespace-nowrap"
                        onClick={() => handleTagFilter(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {tags.length > 4 && (
                      <Badge variant="secondary" className="cursor-pointer text-xs whitespace-nowrap">
                        +{tags.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* View Controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none h-9"
                    >
                      <Grid className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">Grid</span>
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none h-9"
                    >
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">List</span>
                    </Button>
                  </div>
                  
                  {selectedImages.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSelectAll}
                      className="bg-gradient-to-r from-primary/10 to-secondary/10 h-9 whitespace-nowrap"
                    >
                      {selectedImages.length === filteredImages.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </div>

              {selectedTags.length > 0 && (
                <div className="mt-4 flex gap-3 items-center">
                  <span className="text-sm text-muted-foreground font-medium">Active filters:</span>
                  <div className="flex gap-2 flex-wrap">
                    {selectedTags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <Badge key={tag.id} variant="secondary" className="gap-2">
                          {tag.name}
                          <button
                            onClick={() => handleTagFilter(tag.id)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-1 transition-colors"
                          >
                            ×
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
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
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-4">
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
          </div>
        </TabsContent>

        <TabsContent value="data-manager">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <PRDataManager />
          </div>
        </TabsContent>

        <TabsContent value="export">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <PRMetadataExporter />
          </div>
        </TabsContent>

        <TabsContent value="press-kits">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <PressKitManager />
          </div>
        </TabsContent>

        <TabsContent value="ai-templates">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <PressKitTemplateGenerator />
          </div>
        </TabsContent>

        <TabsContent value="tags">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <PRTagManager
              tags={tags}
              onTagsUpdate={refreshTags}
            />
          </div>
        </TabsContent>

        <TabsContent value="bulk">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
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
          </div>
        </TabsContent>
        
        <TabsContent value="hero-manager">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <HeroManagement />
          </div>
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

      {/* Media Library Dialog */}
      <MediaLibraryDialog
        open={showMediaLibrary}
        onOpenChange={setShowMediaLibrary}
      />

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