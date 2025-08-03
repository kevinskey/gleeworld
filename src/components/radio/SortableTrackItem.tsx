import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Play, 
  Pause, 
  Music, 
  Clock, 
  Mic,
  X 
} from 'lucide-react';

interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  audio_url: string;
  category: 'performance' | 'announcement' | 'interlude' | 'alumni_story';
}

interface SortableTrackItemProps {
  track: RadioTrack;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  canSort: boolean;
  onPlay: (track: RadioTrack) => void;
  onRemove: (trackId: string) => void;
}

export const SortableTrackItem = ({
  track,
  isCurrentTrack,
  isPlaying,
  canSort,
  onPlay,
  onRemove
}: SortableTrackItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id, disabled: !canSort });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <Music className="h-4 w-4" />;
      case 'announcement':
        return <Mic className="h-4 w-4" />;
      case 'alumni_story':
        return <Clock className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance':
        return 'bg-brand-100 text-brand-800';
      case 'announcement':
        return 'bg-spelman-blue-light/20 text-spelman-blue-dark';
      case 'alumni_story':
        return 'bg-accent/20 text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className={`mb-2 transition-all ${
        isCurrentTrack 
          ? 'border-2 border-brand-400 bg-brand-50' 
          : 'border border-muted hover:border-brand-200'
      } ${isDragging ? 'shadow-lg' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className={`flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50 transition-colors ${
                !canSort ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Play Button */}
            <Button
              size="sm"
              variant={isCurrentTrack && isPlaying ? "default" : "outline"}
              onClick={() => onPlay(track)}
              className="flex-shrink-0 w-8 h-8 p-0"
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground truncate">
                  {track.title}
                </h4>
                {isCurrentTrack && (
                  <Badge variant="default" className="text-xs bg-brand-600">
                    NOW PLAYING
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {track.artist}
              </p>
              {track.album && (
                <p className="text-xs text-muted-foreground/70 truncate">
                  {track.album}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-xs ${getCategoryColor(track.category)}`}>
                  {getCategoryIcon(track.category)}
                  <span className="ml-1">{track.category.replace('_', ' ')}</span>
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatTime(track.duration)}
                </span>
                {!isCurrentTrack && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(track.id)}
                    className="w-6 h-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};