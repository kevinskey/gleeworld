import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Trash2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Recording } from './SightSingingStudio';

interface RecordingsListProps {
  recordings: Recording[];
  onPlayRecording: (recording: Recording) => void;
  onDeleteRecording: (recordingId: string) => void;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({
  recordings,
  onPlayRecording,
  onDeleteRecording
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-sm">No recordings yet</div>
            <div className="text-xs mt-1">
              Create an exercise and record yourself singing to get started
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Recent Recordings ({recordings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recordings.slice(0, 5).map((recording) => (
          <div
            key={recording.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {formatDuration(recording.duration)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPlayRecording(recording)}
                className="h-8 w-8 p-0"
              >
                <Play className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteRecording(recording.id)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {recordings.length > 5 && (
          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              +{recordings.length - 5} more recordings
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};