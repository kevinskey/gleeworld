import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Search,
  Music2,
  FileAudio,
  Play,
  X,
  Check
} from 'lucide-react';

interface MediaItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  category: string | null;
}

interface PlaylistMedia {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  media?: MediaItem;
}

interface PlaylistMediaManagerProps {
  playlistId: string;
  playlistTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlaylistMediaManager: React.FC<PlaylistMediaManagerProps> = ({
  playlistId,
  playlistTitle,
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [playlistMedia, setPlaylistMedia] = useState<PlaylistMedia[]>([]);
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current');

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
        .or('file_type.ilike.%audio%,file_type.ilike.%mp3%,category.eq.audio')
        .order('title');

      if (error) throw error;
      setAvailableMedia(data || []);
    } catch (err) {
      console.error('Error fetching available media:', err);
    }
  }, []);

  useEffect(() => {
    if (open) {
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

  const currentMediaIds = new Set(playlistMedia.map(pm => pm.media_id));
  
  const filteredAvailable = availableMedia.filter(m => 
    !currentMediaIds.has(m.id) &&
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAudio = (fileType: string | null) => {
    return fileType?.includes('audio') || fileType?.includes('mp3');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Media Library - {playlistTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'current' | 'add')}>
          <TabsList className="w-full">
            <TabsTrigger value="current" className="flex-1">
              Current ({playlistMedia.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              Add Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : playlistMedia.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No media in this playlist yet.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab('add')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Media
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {playlistMedia.map((pm, index) => (
                    <div 
                      key={pm.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => moveMedia(pm.id, 'up')}
                        >
                          <GripVertical className="h-4 w-4 rotate-180" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === playlistMedia.length - 1}
                          onClick={() => moveMedia(pm.id, 'down')}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-center w-10 h-10 rounded bg-primary/10">
                        <FileAudio className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {pm.media?.title || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pm.media?.category || 'Media'}
                        </p>
                      </div>

                      {pm.media?.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(pm.media?.file_url, '_blank')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromPlaylist(pm.id)}
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
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search audio files..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[350px]">
              {filteredAvailable.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No matching audio files found' : 'No audio files available'}
                </div>
              ) : (
                <div className="space-y-2">
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
                        <p className="font-medium text-sm truncate">{media.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {media.category || media.file_type || 'Audio'}
                        </p>
                      </div>

                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
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
};

export default PlaylistMediaManager;
