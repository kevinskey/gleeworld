import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface RecordingsListProps {
  recordings: Array<{
    id: string;
    exerciseId: string;
    audioUrl: string;
    duration: number;
    createdAt: string;
  }>;
  onPlayRecording?: (recording: any) => void;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({ recordings, onPlayRecording }) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Previous Recordings</h3>
      <div className="space-y-2">
        {recordings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recordings yet</p>
        ) : (
          recordings.map((recording) => (
            <div key={recording.id} className="flex justify-between items-center p-2 border rounded">
              <div>
                <span className="text-sm">{new Date(recording.createdAt).toLocaleDateString()}</span>
                <Badge variant="outline" className="ml-2">{recording.duration}s</Badge>
              </div>
              {onPlayRecording && (
                <Button size="sm" variant="outline" onClick={() => onPlayRecording(recording)}>
                  <Play className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};