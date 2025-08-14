import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, RotateCcw } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  hasRecording: boolean;
  onClearRecording: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  duration,
  onStartRecording,
  onStopRecording,
  hasRecording,
  onClearRecording
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-2">
        <Button
          variant={isRecording ? "destructive" : "default"}
          onClick={isRecording ? onStopRecording : onStartRecording}
          size="lg"
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Record Performance
            </>
          )}
        </Button>

        {hasRecording && !isRecording && (
          <Button variant="outline" onClick={onClearRecording}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono">REC</span>
          </div>
        )}
        
        <Badge variant={isRecording ? "destructive" : "outline"}>
          {formatDuration(duration)}
        </Badge>

        {!isRecording && (
          <span className="text-xs text-muted-foreground">
            {hasRecording ? "Recording ready for evaluation" : "4-click count-off, then recording starts"}
          </span>
        )}
      </div>
    </div>
  );
};