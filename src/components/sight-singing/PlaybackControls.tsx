import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Music } from 'lucide-react';

interface PlaybackControlsProps {
  musicXML: string;
  tempo: number;
  timeSignature: string;
  isPlaying: boolean;
  onPlay: (musicXML: string, tempo: number) => void;
  onStop: () => void;
  mode: 'click-only' | 'click-and-score';
  onModeChange: (mode: 'click-only' | 'click-and-score') => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  musicXML,
  tempo,
  timeSignature,
  isPlaying,
  onPlay,
  onStop,
  mode,
  onModeChange
}) => {
  const handlePlay = () => {
    onPlay(musicXML, tempo);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant={isPlaying ? "destructive" : "default"}
          onClick={isPlaying ? onStop : handlePlay}
          disabled={!musicXML}
        >
          {isPlaying ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Play
            </>
          )}
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant={mode === 'click-only' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('click-only')}
          >
            Click Only
          </Button>
          <Button
            variant={mode === 'click-and-score' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('click-and-score')}
          >
            <Music className="h-3 w-3 mr-1" />
            Click + Score
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{tempo} BPM</Badge>
        <Badge variant="outline">{timeSignature}</Badge>
        <span className="text-xs">One-bar click intro</span>
      </div>
    </div>
  );
};