import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Mic, Square, RotateCcw } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  hasRecording: boolean;
  onClearRecording: () => void;
  metronomeIsPlaying?: boolean;
  currentBpm?: number;
  onBpmChange?: (bpm: number) => void;
  showTempoControl?: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  duration,
  onStartRecording,
  onStopRecording,
  hasRecording,
  onClearRecording,
  metronomeIsPlaying = false,
  currentBpm = 120,
  onBpmChange,
  showTempoControl = false
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* Tempo Control for Uploaded Scores */}
      {showTempoControl && !isRecording && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Tempo</span>
            <Badge variant="outline" className="text-xs">
              {currentBpm} BPM
            </Badge>
          </div>
          <Slider
            value={[currentBpm]}
            onValueChange={(value) => onBpmChange?.(value[0])}
            min={60}
            max={200}
            step={5}
            className="w-full"
          />
        </div>
      )}
      
      <div className="flex gap-1">
        <Button
          variant={isRecording ? "destructive" : "default"}
          onClick={isRecording ? onStopRecording : onStartRecording}
          size="sm"
          className="flex-1 h-7 text-xs"
        >
          {isRecording ? (
            <>
              <Square className="h-3 w-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-3 w-3 mr-1" />
              Record
            </>
          )}
        </Button>

        {hasRecording && !isRecording && (
          <Button
            variant="outline"
            onClick={onClearRecording}
            size="sm"
            className="h-7 text-xs px-2"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {(isRecording || hasRecording) && (
        <div className="text-center space-y-1">
          <Badge variant={isRecording ? "destructive" : "secondary"} className="text-xs">
            {isRecording ? `Recording ${formatDuration(duration)}` : `Recorded ${formatDuration(duration)}`}
          </Badge>
          {isRecording && metronomeIsPlaying && (
            <Badge variant="outline" className="text-xs">
              ♪ {currentBpm} BPM
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};