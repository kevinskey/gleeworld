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
  hasExercise: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  mode,
  onModeChange,
  onStartPlayback,
  onStopPlayback,
  hasExercise
}) => {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium mb-1 block">Mode</label>
        <Select value={mode} onValueChange={onModeChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="click-only">Click Only</SelectItem>
            <SelectItem value="click-and-score">Click + Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={isPlaying ? onStopPlayback : onStartPlayback}
        disabled={!hasExercise}
        variant={isPlaying ? "destructive" : "default"}
        size="sm"
        className="w-full h-7 text-xs px-2"
      >
        {isPlaying ? (
          <>
            <Square className="h-3 w-3 mr-1" />
            Stop
          </>
        ) : (
          <>
            <Play className="h-3 w-3 mr-1" />
            Play
          </>
        )}
      </Button>
    </div>
  );
};