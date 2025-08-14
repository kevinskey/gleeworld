import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Download } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  mode: 'click-only' | 'click-and-score';
  onModeChange: (mode: 'click-only' | 'click-and-score') => void;
  onStartPlayback: () => void;
  onStopPlayback: () => void;
  onDownload: () => void;
  hasExercise: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  mode,
  onModeChange,
  onStartPlayback,
  onStopPlayback,
  onDownload,
  hasExercise
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Playback Mode</label>
        <Select value={mode} onValueChange={onModeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="click-only">Click Only (Metronome)</SelectItem>
            <SelectItem value="click-and-score">Click and Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={isPlaying ? onStopPlayback : onStartPlayback}
          disabled={!hasExercise}
          variant={isPlaying ? "destructive" : "default"}
          className="flex-1"
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

        <Button
          onClick={onDownload}
          disabled={!hasExercise}
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
};