import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MediaLibrary } from './MediaLibrary';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  audio_url: string;
  genre?: string;
  play_count: number;
  created_at: string;
  category?: 'performance' | 'announcement' | 'interlude' | 'alumni_story';
}

interface AudioArchive {
  id: string;
  title: string;
  artist_info?: string;
  audio_url: string;
  duration_seconds?: number;
  category: string;
  performance_date?: string;
  created_at: string;
}

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToPlaylist?: (track: MusicTrack | AudioArchive) => void;
  onPlayTrack?: (track: MusicTrack | AudioArchive) => void;
  isPlaying?: boolean;
  currentTrack?: string;
}

export const MediaLibraryDialog = ({
  open,
  onOpenChange,
  onAddToPlaylist,
  onPlayTrack,
  isPlaying,
  currentTrack
}: MediaLibraryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Media Library</span>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          <MediaLibrary
            onAddToPlaylist={onAddToPlaylist}
            onPlayTrack={onPlayTrack}
            isPlaying={isPlaying}
            currentTrack={currentTrack}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};