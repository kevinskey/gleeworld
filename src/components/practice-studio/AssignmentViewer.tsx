import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Mic, 
  Calendar, 
  FileMusic,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';
import { PlaybackControls } from '@/components/sight-singing/PlaybackControls';
import { useTonePlayback } from '@/components/sight-singing/hooks/useTonePlayback';

interface AssignmentViewerProps {
  assignment: any;
  onStartRecording: () => void;
}

export const AssignmentViewer: React.FC<AssignmentViewerProps> = ({ 
  assignment, 
  onStartRecording 
}) => {
  const [soundSettings] = useState({ notes: 'piano', click: 'woodblock' });
  
  const { 
    isPlaying, 
    mode, 
    setMode, 
    startPlayback, 
    stopPlayback 
  } = useTonePlayback(soundSettings);

  const isOverdue = new Date(assignment.due_date) < new Date();
  const timeRemaining = Math.ceil((new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handlePlayScore = async () => {
    if (!assignment.sheet_music?.xml_content) return;
    
    if (isPlaying) {
      stopPlayback();
    } else {
      await startPlayback(assignment.sheet_music.xml_content, 120);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                {assignment.title}
                {isOverdue ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Overdue
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeRemaining > 0 ? `${timeRemaining} days left` : 'Due today'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {assignment.description}
              </CardDescription>
            </div>
            <Button onClick={onStartRecording} className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Assignment Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Due Date</div>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                {new Date(assignment.due_date).toLocaleDateString()} at {new Date(assignment.due_date).toLocaleTimeString()}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Sheet Music</div>
              <div className="flex items-center gap-1 text-sm">
                <FileMusic className="h-3 w-3" />
                {assignment.sheet_music?.title || 'No score assigned'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Maximum Attempts</div>
              <div className="text-sm">
                {assignment.max_attempts === -1 ? 'Unlimited' : assignment.max_attempts}
              </div>
            </div>
          </div>
          
          {/* Special Instructions */}
          {assignment.instructions && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Instructions</div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                {assignment.instructions}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Display and Playback */}
      {assignment.sheet_music?.xml_content ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Score</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayScore}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Play
                    </>
                  )}
                </Button>
                
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="click-only">Metronome Only</option>
                  <option value="click-and-score">Metronome + Notes</option>
                  <option value="pitch-only">Notes Only</option>
                </select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-96 w-full border rounded-lg p-4">
              <ScoreDisplay musicXML={assignment.sheet_music.xml_content} />
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No Score Available</h3>
              <p className="text-sm text-muted-foreground">
                This assignment doesn't have a score attached yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practice Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Practice Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Listen to the playback first to familiarize yourself with the melody and rhythm</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Practice with just the metronome to work on rhythm accuracy</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Start slowly and gradually increase tempo as you become more comfortable</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Record yourself when you feel confident with the piece</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};