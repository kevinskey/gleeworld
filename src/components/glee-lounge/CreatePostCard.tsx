import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { ImagePlus, MapPin, Send, Loader2, X, Camera, Check } from 'lucide-react';

interface CreatePostCardProps {
  userProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  onPostCreated?: () => void;
}

interface GleeCamPhoto {
  name: string;
  url: string;
  created_at: string;
  category?: string;
}

export function CreatePostCard({ userProfile, onPostCreated }: CreatePostCardProps) {
  const [content, setContent] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [gleeCamPhotos, setGleeCamPhotos] = useState<GleeCamPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch ALL Glee Cam photos from media library (consolidated view)
  const fetchGleeCamPhotos = async () => {
    setLoadingPhotos(true);
    try {
      // Fetch from gw_media_library where bucket_id is quick-capture-media
      // This gives us a consolidated view of all Glee Cam photos across all users
      const { data: mediaItems, error: mediaError } = await supabase
        .from('gw_media_library')
        .select(`
          id,
          file_url,
          title,
          created_at,
          glee_cam_category_id,
          glee_cam_categories (
            name,
            slug
          )
        `)
        .eq('bucket_id', 'quick-capture-media')
        .order('created_at', { ascending: false })
        .limit(100);

      if (mediaError) {
        console.error('Media library error:', mediaError);
        // Fallback to storage bucket listing for user's own photos
        await fetchUserPhotosFromStorage();
        return;
      }

      if (mediaItems && mediaItems.length > 0) {
        const photos: GleeCamPhoto[] = mediaItems
          .filter(item => item.file_url)
          .map(item => ({
            name: item.title || 'Glee Cam Photo',
            url: item.file_url,
            created_at: item.created_at || '',
            category: (item.glee_cam_categories as any)?.name || 'Uncategorized'
          }));
        setGleeCamPhotos(photos);
      } else {
        // No items in media library, try storage directly
        await fetchUserPhotosFromStorage();
      }
    } catch (error) {
      console.error('Error fetching Glee Cam photos:', error);
      await fetchUserPhotosFromStorage();
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Fallback: Fetch from storage bucket directly (user's own photos)
  const fetchUserPhotosFromStorage = async () => {
    if (!userProfile?.user_id) {
      setGleeCamPhotos([]);
      return;
    }

    try {
      const { data: folders } = await supabase.storage
        .from('quick-capture-media')
        .list(userProfile.user_id, { limit: 100 });

      const allPhotos: GleeCamPhoto[] = [];
      
      for (const folder of folders || []) {
        if (!folder.name.includes('.')) {
          const { data: files } = await supabase.storage
            .from('quick-capture-media')
            .list(`${userProfile.user_id}/${folder.name}`, {
              limit: 50,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (files) {
            const mediaFiles = files
              .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i))
              .map(file => {
                const { data } = supabase.storage
                  .from('quick-capture-media')
                  .getPublicUrl(`${userProfile.user_id}/${folder.name}/${file.name}`);
                return {
                  name: file.name,
                  url: data.publicUrl,
                  created_at: file.created_at || '',
                  category: folder.name
                };
              });
            allPhotos.push(...mediaFiles);
          }
        }
      }

      allPhotos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setGleeCamPhotos(allPhotos.slice(0, 50));
    } catch (error) {
      console.error('Error fetching from storage:', error);
      setGleeCamPhotos([]);
    }
  };

  useEffect(() => {
    if (showPhotoPicker) {
      fetchGleeCamPhotos();
    }
  }, [showPhotoPicker, userProfile?.user_id]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: 'Please write something',
        description: 'Your post cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('gw_social_posts').insert({
        user_id: user.id,
        content: content.trim(),
        location_tag: locationTag.trim() || null,
        media_urls: mediaUrls,
      });

      if (error) throw error;

      setContent('');
      setLocationTag('');
      setShowLocation(false);
      setMediaUrls([]);
      
      toast({
        title: 'Posted!',
        description: 'Your post is now live in the lounge',
      });
      
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Failed to post',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('social-posts')
          .upload(`${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
          });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('social-posts')
          .getPublicUrl(`${fileName}`);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      setMediaUrls(prev => [...prev, ...uploadedUrls]);
      toast({
        title: 'Media uploaded',
        description: `${files.length} file(s) added`,
      });
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const togglePhotoSelection = (url: string) => {
    setSelectedPhotos(prev => 
      prev.includes(url) 
        ? prev.filter(p => p !== url)
        : [...prev, url]
    );
  };

  const addSelectedPhotos = () => {
    setMediaUrls(prev => [...prev, ...selectedPhotos]);
    setSelectedPhotos([]);
    setShowPhotoPicker(false);
    toast({
      title: 'Photos added',
      description: `${selectedPhotos.length} photo(s) from Glee Cam added`,
    });
  };

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|mov|webm|ogg)$/i);
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getAvatarUrl(userProfile?.avatar_url) || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(userProfile?.full_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind? Share updates from your holiday spot..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
            />
            
            {showLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add location (e.g., Miami Beach 🌴)"
                  value={locationTag}
                  onChange={(e) => setLocationTag(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowLocation(false);
                    setLocationTag('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {mediaUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="relative">
                    {isVideo(url) ? (
                      <video
                        src={url}
                        className="h-16 w-16 object-cover rounded-md"
                        muted
                      />
                    ) : (
                      <img
                        src={url}
                        alt="Upload"
                        className="h-16 w-16 object-cover rounded-md"
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={isUploading}
                  asChild
                >
                  <label>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Photo'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleMediaUpload}
                      disabled={isUploading}
                    />
                  </label>
                </Button>

                {/* Glee Cam Photo Picker */}
                <Dialog open={showPhotoPicker} onOpenChange={setShowPhotoPicker}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="hidden sm:inline">Glee Cam</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Select from Glee Cam</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[350px]">
                      {loadingPhotos ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : gleeCamPhotos.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No Glee Cam photos yet</p>
                          <p className="text-sm">Take some photos with Glee Cam first!</p>
                        </div>
                      ) : (
                        <div className="space-y-4 p-1">
                          {/* Group photos by category */}
                          {Object.entries(
                            gleeCamPhotos.reduce((acc, photo) => {
                              const cat = photo.category || 'Uncategorized';
                              if (!acc[cat]) acc[cat] = [];
                              acc[cat].push(photo);
                              return acc;
                            }, {} as Record<string, GleeCamPhoto[]>)
                          ).map(([category, photos]) => (
                            <div key={category}>
                              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                {category.replace(/-/g, ' ')}
                              </h4>
                              <div className="grid grid-cols-3 gap-2">
                                {photos.map((photo, idx) => (
                                  <div
                                    key={`${photo.name}-${idx}`}
                                    className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${
                                      selectedPhotos.includes(photo.url)
                                        ? 'border-primary'
                                        : 'border-transparent hover:border-muted-foreground/30'
                                    }`}
                                    onClick={() => togglePhotoSelection(photo.url)}
                                  >
                                    {isVideo(photo.url) ? (
                                      <video
                                        src={photo.url}
                                        className="w-full h-20 object-cover"
                                        muted
                                      />
                                    ) : (
                                      <img
                                        src={photo.url}
                                        alt={photo.name}
                                        className="w-full h-20 object-cover"
                                      />
                                    )}
                                    {selectedPhotos.includes(photo.url) && (
                                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                        <Check className="h-5 w-5 text-primary-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {selectedPhotos.length > 0 && (
                      <Button onClick={addSelectedPhotos} className="w-full">
                        Add {selectedPhotos.length} photo(s)
                      </Button>
                    )}
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowLocation(!showLocation)}
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Location</span>
                </Button>
              </div>
              
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}