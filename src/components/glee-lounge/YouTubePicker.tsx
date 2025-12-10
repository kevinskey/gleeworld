import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractYouTubeVideoId, getYouTubeThumbnail, GLEE_CLUB_CHANNEL_URL } from '@/utils/youtubeUtils';
import { Youtube, Link, ExternalLink, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface YouTubePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoSelect: (videoId: string) => void;
  selectedVideos?: string[];
}

export function YouTubePicker({ open, onOpenChange, onVideoSelect, selectedVideos = [] }: YouTubePickerProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handleAddFromUrl = () => {
    const videoId = extractYouTubeVideoId(urlInput);
    if (videoId) {
      if (selectedVideos.includes(videoId)) {
        toast({
          title: 'Already added',
          description: 'This video is already in your post',
        });
        return;
      }
      onVideoSelect(videoId);
      setUrlInput('');
      toast({
        title: 'Video added!',
        description: 'YouTube video attached to your post',
      });
    } else {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL or video ID',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddFromUrl();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Youtube className="h-5 w-5 text-red-500" />
            Add YouTube Video
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="gap-1">
              <Link className="h-4 w-4" />
              Paste URL
            </TabsTrigger>
            <TabsTrigger value="channel" className="gap-1">
              <Youtube className="h-4 w-4" />
              Glee Club Channel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Paste a YouTube URL or video ID
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/watch?v=... or video ID"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button onClick={handleAddFromUrl} disabled={!urlInput.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {/* Preview if valid */}
            {urlInput && extractYouTubeVideoId(urlInput) && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground">Preview:</p>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                  <img
                    src={getYouTubeThumbnail(extractYouTubeVideoId(urlInput)!, 'medium')}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="channel" className="space-y-4 mt-4">
            <div className="text-center py-6 space-y-4">
              <Youtube className="h-12 w-12 mx-auto text-red-500" />
              <div>
                <h3 className="font-semibold text-foreground">Spelman College Glee Club</h3>
                <p className="text-sm text-muted-foreground">Official YouTube Channel</p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open(GLEE_CLUB_CHANNEL_URL, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Channel
              </Button>
              <p className="text-xs text-muted-foreground">
                Browse the channel, copy a video URL, then paste it in the "Paste URL" tab
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Selected videos */}
        {selectedVideos.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              {selectedVideos.length} video(s) selected
            </p>
            <ScrollArea className="max-h-32">
              <div className="flex gap-2 flex-wrap">
                {selectedVideos.map((videoId) => (
                  <div key={videoId} className="relative">
                    <img
                      src={getYouTubeThumbnail(videoId, 'default')}
                      alt="Selected video"
                      className="h-16 w-24 object-cover rounded border-2 border-primary"
                    />
                    <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
