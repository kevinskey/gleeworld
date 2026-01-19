import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Plus, Trash2, ChevronUp, ChevronDown, FileAudio, Music, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
interface PlaylistMediaManagerProps {
  playlistId: string;
  playlistTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlaylistMediaItem {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  media?: {
    id: string;
    title: string | null;
    file_url: string | null;
    file_type: string | null;
    category: string | null;
  };
}

interface MediaItem {
  id: string;
  title: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
}

export function PlaylistMediaManager({ playlistId, playlistTitle, open, onOpenChange }: PlaylistMediaManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [playlistMedia, setPlaylistMedia] = useState<PlaylistMediaItem[]>([]);
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPlaylistMedia = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_playlist_media')
        .select('id, playlist_id, media_id, position')
        .eq('playlist_id', playlistId)
        .order('position');

      if (error) throw error;

      // Fetch media details
      const mediaIds = (data || []).map(pm => pm.media_id);
      if (mediaIds.length > 0) {
        const { data: mediaData, error: mediaError } = await supabase
          .from('gw_media_library')
          .select('id, title, file_url, file_type, category')
          .in('id', mediaIds);

        if (mediaError) throw mediaError;

        const mediaMap = new Map(mediaData?.map(m => [m.id, m]));
        const enriched = (data || []).map(pm => ({
          ...pm,
          media: mediaMap.get(pm.media_id)
        }));
        setPlaylistMedia(enriched);
      } else {
        setPlaylistMedia([]);
      }
    } catch (err) {
      console.error('Error fetching playlist media:', err);
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  const fetchAvailableMedia = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, category')
        .or('file_type.ilike.%audio%,file_type.ilike.%mp3%')
        .order('title');

      if (error) throw error;
      setAvailableMedia(data || []);
    } catch (err) {
      console.error('Error fetching available media:', err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchPlaylistMedia();
      fetchAvailableMedia();
    }
  }, [open, fetchPlaylistMedia, fetchAvailableMedia]);

  const addMediaToPlaylist = async (mediaId: string) => {
    try {
      const maxPosition = playlistMedia.length > 0 
        ? Math.max(...playlistMedia.map(pm => pm.position)) + 1 
        : 0;

      const { error } = await supabase
        .from('gw_course_playlist_media')
        .insert({
          playlist_id: playlistId,
          media_id: mediaId,
          position: maxPosition
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already in playlist', variant: 'destructive' });
          return;
        }
        throw error;
      }

      toast({ title: 'Added to playlist' });
      fetchPlaylistMedia();
    } catch (err: any) {
      toast({ title: 'Error adding media', description: err.message, variant: 'destructive' });
    }
  };

  const removeFromPlaylist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_course_playlist_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Removed from playlist' });
      fetchPlaylistMedia();
    } catch (err: any) {
      toast({ title: 'Error removing media', description: err.message, variant: 'destructive' });
    }
  };

  const moveMedia = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = playlistMedia.findIndex(pm => pm.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= playlistMedia.length) return;

    const currentItem = playlistMedia[currentIndex];
    const swapItem = playlistMedia[newIndex];

    try {
      await Promise.all([
        supabase
          .from('gw_course_playlist_media')
          .update({ position: swapItem.position })
          .eq('id', currentItem.id),
        supabase
          .from('gw_course_playlist_media')
          .update({ position: currentItem.position })
          .eq('id', swapItem.id)
      ]);
      
      fetchPlaylistMedia();
    } catch (err: any) {
      toast({ title: 'Error reordering', description: err.message, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (const file of Array.from(files)) {
        if (!file.type.includes('audio') && !file.name.toLowerCase().endsWith('.mp3')) {
          toast({ title: `Skipped ${file.name}`, description: 'Not an audio file', variant: 'destructive' });
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `audio/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: `Failed to upload ${file.name}`, description: uploadError.message, variant: 'destructive' });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media-library')
          .getPublicUrl(filePath);

        // Add to media library
        const { data: mediaData, error: mediaError } = await supabase
          .from('gw_media_library')
          .insert({
            title: file.name.replace(/\.[^/.]+$/, ''),
            file_url: urlData.publicUrl,
            file_path: filePath,
            file_type: file.type || 'audio/mpeg',
            file_size: file.size,
            category: 'audio',
            original_filename: file.name
          })
          .select()
          .single();

        if (mediaError) {
          console.error('Media library error:', mediaError);
          toast({ title: `Failed to save ${file.name}`, description: mediaError.message, variant: 'destructive' });
          continue;
        }

        // Add to playlist
        const maxPosition = playlistMedia.length + successCount;
        await supabase
          .from('gw_course_playlist_media')
          .insert({
            playlist_id: playlistId,
            media_id: mediaData.id,
            position: maxPosition
          });

        successCount++;
      }

      if (successCount > 0) {
        toast({ title: `Added ${successCount} track(s) to playlist` });
        fetchPlaylistMedia();
        fetchAvailableMedia();
      }
    } catch (err: any) {
      toast({ title: 'Upload error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const currentMediaIds = new Set(playlistMedia.map(pm => pm.media_id));
  
  const filteredAvailable = availableMedia.filter(m => 
    !currentMediaIds.has(m.id) &&
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Manage Tracks: {playlistTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">
              Current Tracks ({playlistMedia.length})
            </TabsTrigger>
            <TabsTrigger value="add">
              Add Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : playlistMedia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileAudio className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tracks in this playlist yet.</p>
                <p className="text-sm">Switch to "Add Media" to add MP3s.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {playlistMedia.map((item, index) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveMedia(item.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveMedia(item.id, 'down')}
                          disabled={index === playlistMedia.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-center w-8 h-8 rounded bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      
                      <div className="flex items-center justify-center w-10 h-10 rounded bg-primary/10">
                        <FileAudio className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.media?.title || 'Unknown'}</p>
                        {item.media?.category && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {item.media.category}
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromPlaylist(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            {/* Upload Section */}
            <div className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted/30">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*,.mp3"
                multiple
                className="hidden"
                id="mp3-upload"
              />
              <Label
                htmlFor="mp3-upload"
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {uploading ? 'Uploading...' : 'Click to upload MP3 files'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Files will be added to Media Library and this playlist
                </span>
              </Label>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search existing audio files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[280px]">
              {filteredAvailable.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No audio files available to add.</p>
                  <p className="text-sm">Upload MP3s above or browse existing files.</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredAvailable.map((media) => (
                    <div 
                      key={media.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => addMediaToPlaylist(media.id)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded bg-muted">
                        <FileAudio className="h-5 w-5 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{media.title || 'Untitled'}</p>
                        {media.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {media.category}
                          </Badge>
                        )}
                      </div>
                      
                      <Button variant="ghost" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
