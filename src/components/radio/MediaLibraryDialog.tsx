import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MediaLibrary } from './MediaLibrary';
import { MediaUploadButton } from '@/components/media/MediaUploadButton';

interface MediaFile {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  tags?: string[];
  category?: string;
  created_at: string;
  created_by?: string;
  is_public?: boolean;
}

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToPlaylist?: (track: MediaFile) => void;
  onPlayTrack?: (track: MediaFile) => void;
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
          <DialogTitle className="flex items-center justify-between">
            <span>Media Library</span>
            <div className="flex gap-2">
              <MediaUploadButton 
                context="pr-hub"
                className="gap-2"
                onUploadComplete={() => {
                  // Refresh the media library when upload completes
                  window.location.reload();
                }}
              />
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
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