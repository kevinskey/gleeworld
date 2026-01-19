import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Camera, Grid3X3, List, Search, Calendar, Tag, Folder, 
  Image as ImageIcon, Video, Play, X, Download, ExternalLink,
  ChevronLeft, ChevronRight, Loader2, Clock, Filter, Trash2, Star, Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface GalleryPhoto {
  id: string;
  title: string | null;
  description: string | null;
  file_url: string;
  file_type: string | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  is_featured: boolean | null;
  source: 'media_library' | 'quick_capture' | 'scraped';
  event_name?: string;
  glee_cam_category_id?: string | null;
}

interface GleeCamCategory {
  id: string;
  name: string;
  slug: string;
}

type ViewMode = 'grid' | 'list';
type OrganizeBy = 'chronology' | 'theme' | 'event' | 'type';

export const PhotoGallery: React.FC = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [gleeCamCategories, setGleeCamCategories] = useState<GleeCamCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [organizeBy, setOrganizeBy] = useState<OrganizeBy>('chronology');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all photos
  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        // Fetch GleeCam categories
        const { data: categories } = await supabase
          .from('glee_cam_categories')
          .select('id, name, slug');
        
        if (categories) {
          setGleeCamCategories(categories);
        }

        // Fetch from gw_media_library (images and videos)
        const { data: mediaLibrary } = await supabase
          .from('gw_media_library')
          .select('*')
          .or('file_type.ilike.%image%,file_type.ilike.%video%')
          .order('created_at', { ascending: false });

        // Fetch from quick_capture_media
        const { data: quickCapture } = await supabase
          .from('quick_capture_media')
          .select('*')
          .order('created_at', { ascending: false });

        const allPhotos: GalleryPhoto[] = [];

        if (mediaLibrary) {
          allPhotos.push(...mediaLibrary.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            file_url: item.file_url,
            file_type: item.file_type,
            category: item.category,
            tags: item.tags,
            created_at: item.created_at,
            is_featured: item.is_featured,
            source: 'media_library' as const,
            glee_cam_category_id: item.glee_cam_category_id
          })));
        }

        if (quickCapture) {
          allPhotos.push(...quickCapture.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            file_url: item.file_url,
            file_type: item.file_type,
            category: item.category,
            tags: null,
            created_at: item.created_at,
            is_featured: false,
            source: 'quick_capture' as const,
            glee_cam_category_id: null
          })));
        }

        // Dedupe by file_url
        const uniquePhotos = allPhotos.reduce((acc, photo) => {
          if (!acc.find(p => p.file_url === photo.file_url)) {
            acc.push(photo);
          }
          return acc;
        }, [] as GalleryPhoto[]);

        setPhotos(uniquePhotos.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  // Filtered and organized photos
  const organizedPhotos = useMemo(() => {
    let filtered = photos.filter(photo => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          photo.title?.toLowerCase().includes(query) ||
          photo.description?.toLowerCase().includes(query) ||
          photo.category?.toLowerCase().includes(query) ||
          photo.tags?.some(t => t.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // Apply active filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'glee-cam') {
        filtered = filtered.filter(p => p.glee_cam_category_id || p.category?.includes('glee'));
      } else if (activeFilter === 'featured') {
        filtered = filtered.filter(p => p.is_featured);
      } else if (activeFilter === 'videos') {
        filtered = filtered.filter(p => p.file_type?.includes('video'));
      } else if (activeFilter === 'images') {
        filtered = filtered.filter(p => p.file_type?.includes('image'));
      } else {
        // GleeCam category filter
        const category = gleeCamCategories.find(c => c.slug === activeFilter);
        if (category) {
          filtered = filtered.filter(p => p.glee_cam_category_id === category.id);
        }
      }
    }

    // Group by organize type
    const grouped: Record<string, GalleryPhoto[]> = {};

    switch (organizeBy) {
      case 'chronology':
        filtered.forEach(photo => {
          const date = format(parseISO(photo.created_at), 'MMMM yyyy');
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(photo);
        });
        break;
      case 'theme':
        filtered.forEach(photo => {
          const theme = photo.category || 'Uncategorized';
          if (!grouped[theme]) grouped[theme] = [];
          grouped[theme].push(photo);
        });
        break;
      case 'event':
        filtered.forEach(photo => {
          const gleeCamCat = gleeCamCategories.find(c => c.id === photo.glee_cam_category_id);
          const event = gleeCamCat?.name || photo.category || 'General';
          if (!grouped[event]) grouped[event] = [];
          grouped[event].push(photo);
        });
        break;
      case 'type':
        filtered.forEach(photo => {
          const type = photo.file_type?.includes('video') ? 'Videos' : 'Photos';
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push(photo);
        });
        break;
    }

    return grouped;
  }, [photos, searchQuery, organizeBy, activeFilter, gleeCamCategories]);

  const isVideo = (photo: GalleryPhoto) => photo.file_type?.includes('video');

  const handleDelete = async (photo: GalleryPhoto) => {
    setIsDeleting(true);
    try {
      const table = photo.source === 'quick_capture' ? 'quick_capture_media' : 'gw_media_library';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success(`${isVideo(photo) ? 'Video' : 'Photo'} deleted successfully`);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
      setPhotoToDelete(null);
    }
  };

  const handleToggleFeatured = async (photo: GalleryPhoto) => {
    if (photo.source === 'quick_capture') {
      toast.error('Cannot feature quick capture photos');
      return;
    }

    try {
      const { error } = await supabase
        .from('gw_media_library')
        .update({ is_featured: !photo.is_featured })
        .eq('id', photo.id);

      if (error) throw error;

      setPhotos(prev => prev.map(p => 
        p.id === photo.id ? { ...p, is_featured: !p.is_featured } : p
      ));
      toast.success(photo.is_featured ? 'Removed from featured' : 'Added to featured');
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Failed to update. Please try again.');
    }
  };

  const PhotoCard = ({ photo }: { photo: GalleryPhoto }) => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div 
          className="relative group cursor-pointer overflow-hidden rounded-lg bg-muted aspect-square"
          onClick={() => setSelectedPhoto(photo)}
        >
          {isVideo(photo) ? (
            <>
              <video 
                src={photo.file_url} 
                className="w-full h-full object-cover"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-12 w-12 text-white" />
              </div>
            </>
          ) : (
            <img 
              src={photo.file_url} 
              alt={photo.title || 'Gallery photo'}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-sm font-medium truncate">
                {photo.title || 'Untitled'}
              </p>
              <p className="text-white/70 text-xs">
                {format(parseISO(photo.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {photo.is_featured && (
              <Badge className="bg-yellow-500 text-black text-xs">Featured</Badge>
            )}
            {photo.glee_cam_category_id && (
              <Badge variant="secondary" className="text-xs">
                <Camera className="h-3 w-3 mr-1" />
                GleeCam
              </Badge>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => setSelectedPhoto(photo)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View Details
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a href={photo.file_url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </ContextMenuItem>
        {photo.source === 'media_library' && (
          <ContextMenuItem onClick={() => handleToggleFeatured(photo)}>
            <Star className={`h-4 w-4 mr-2 ${photo.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            {photo.is_featured ? 'Remove from Featured' : 'Mark as Featured'}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => setPhotoToDelete(photo)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  const PhotoListItem = ({ photo }: { photo: GalleryPhoto }) => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div 
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer border"
          onClick={() => setSelectedPhoto(photo)}
        >
          <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0">
            {isVideo(photo) ? (
              <>
                <video src={photo.file_url} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </>
            ) : (
              <img src={photo.file_url} alt={photo.title || ''} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{photo.title || 'Untitled'}</p>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(photo.created_at), 'MMM d, yyyy')}
            </p>
            <div className="flex gap-1 mt-1">
              {photo.category && <Badge variant="outline" className="text-xs">{photo.category}</Badge>}
              {isVideo(photo) && <Badge variant="secondary" className="text-xs"><Video className="h-3 w-3 mr-1" />Video</Badge>}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => setSelectedPhoto(photo)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View Details
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a href={photo.file_url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </ContextMenuItem>
        {photo.source === 'media_library' && (
          <ContextMenuItem onClick={() => handleToggleFeatured(photo)}>
            <Star className={`h-4 w-4 mr-2 ${photo.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            {photo.is_featured ? 'Remove from Featured' : 'Mark as Featured'}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => setPhotoToDelete(photo)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Photo Gallery</h2>
          <Badge variant="secondary">{photos.length} items</Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search photos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'} 
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Organization Tabs */}
      <Tabs value={organizeBy} onValueChange={(v) => setOrganizeBy(v as OrganizeBy)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="chronology" className="gap-2">
            <Clock className="h-4 w-4" />
            Chronology
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Tag className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="event" className="gap-2">
            <Calendar className="h-4 w-4" />
            Event
          </TabsTrigger>
          <TabsTrigger value="type" className="gap-2">
            <Folder className="h-4 w-4" />
            Type
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant={activeFilter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={activeFilter === 'glee-cam' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveFilter('glee-cam')}
          className="gap-1"
        >
          <Camera className="h-3 w-3" />
          Glee Cam
        </Button>
        <Button 
          variant={activeFilter === 'featured' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveFilter('featured')}
        >
          Featured
        </Button>
        <Button 
          variant={activeFilter === 'images' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveFilter('images')}
          className="gap-1"
        >
          <ImageIcon className="h-3 w-3" />
          Photos
        </Button>
        <Button 
          variant={activeFilter === 'videos' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveFilter('videos')}
          className="gap-1"
        >
          <Video className="h-3 w-3" />
          Videos
        </Button>
        {gleeCamCategories.map(cat => (
          <Button 
            key={cat.id}
            variant={activeFilter === cat.slug ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveFilter(cat.slug)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Photo Grid/List */}
      <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px]">
        <div className="space-y-8">
          {Object.entries(organizedPhotos).map(([group, groupPhotos]) => (
            <div key={group}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {organizeBy === 'chronology' && <Calendar className="h-5 w-5 text-primary" />}
                {organizeBy === 'theme' && <Tag className="h-5 w-5 text-primary" />}
                {organizeBy === 'event' && <Camera className="h-5 w-5 text-primary" />}
                {organizeBy === 'type' && <Folder className="h-5 w-5 text-primary" />}
                {group}
                <Badge variant="secondary">{groupPhotos.length}</Badge>
              </h3>
              
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {groupPhotos.map(photo => (
                    <PhotoCard key={photo.id} photo={photo} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {groupPhotos.map(photo => (
                    <PhotoListItem key={photo.id} photo={photo} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(organizedPhotos).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No photos found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.title || 'Photo'}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {selectedPhoto && (
              isVideo(selectedPhoto) ? (
                <video 
                  src={selectedPhoto.file_url} 
                  controls 
                  autoPlay
                  className="w-full max-h-[70vh] rounded-lg"
                />
              ) : (
                <img 
                  src={selectedPhoto.file_url} 
                  alt={selectedPhoto.title || 'Photo'}
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              )
            )}
          </div>
          {selectedPhoto && (
            <div className="space-y-2">
              {selectedPhoto.description && (
                <p className="text-muted-foreground">{selectedPhoto.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{format(parseISO(selectedPhoto.created_at), 'MMMM d, yyyy h:mm a')}</span>
                {selectedPhoto.category && <Badge variant="outline">{selectedPhoto.category}</Badge>}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={selectedPhoto.file_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={selectedPhoto.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Original
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {photoToDelete && isVideo(photoToDelete) ? 'Video' : 'Photo'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{photoToDelete?.title || 'Untitled'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => photoToDelete && handleDelete(photoToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PhotoGallery;
