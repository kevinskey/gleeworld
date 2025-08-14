import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Play, Square, Mic, MicOff, Volume2 } from 'lucide-react';

interface SightSingingControlsProps {
  // Practice controls
  isPlaying: boolean;
  onStartPractice: () => void;
  onStopPractice: () => void;
  
  // Recording controls
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordingTime: number;
  
  // Settings
  tempo: number;
  onTempoChange: (tempo: number) => void;
  metronomeEnabled: boolean;
  onMetronomeToggle: (enabled: boolean) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (volume: number) => void;
  solfegeEnabled: boolean;
  onSolfegeToggle: (enabled: boolean) => void;
  
  // State indicators
  countdownBeats: number;
  isCountingDown: boolean;
}

export const SightSingingControls: React.FC<SightSingingControlsProps> = ({
  isPlaying,
  onStartPractice,
  onStopPractice,
  isRecording,
  onStartRecording,
  onStopRecording,
  recordingTime,
  tempo,
  onTempoChange,
  metronomeEnabled,
  onMetronomeToggle,
  metronomeVolume,
  onMetronomeVolumeChange,
  solfegeEnabled,
  onSolfegeToggle,
  countdownBeats,
  isCountingDown
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Main Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={isPlaying ? onStopPractice : onStartPractice}
            disabled={isRecording}
            className="flex-1"
            size="lg"
          >
            {isPlaying ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop Practice
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Practice
              </>
            )}
          </Button>

          <Button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={isPlaying}
            variant={isRecording ? "destructive" : "secondary"}
            className="flex-1"
            size="lg"
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="flex gap-2 justify-center">
          {isCountingDown && (
            <Badge variant="secondary">
              Count-in: {countdownBeats}/4
            </Badge>
          )}
          {isRecording && (
            <Badge variant="destructive">
              Recording: {formatTime(recordingTime)}
            </Badge>
          )}
          {isPlaying && (
            <Badge variant="default">
              Playing
            </Badge>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          {/* Tempo Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tempo</label>
              <span className="text-sm font-mono">{tempo} BPM</span>
            </div>
            <input
              type="range"
              min="60"
              max="180"
              value={tempo}
              onChange={(e) => onTempoChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isPlaying || isRecording}
            />
          </div>

          {/* Metronome Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Metronome</label>
              <Switch
                checked={metronomeEnabled}
                onCheckedChange={onMetronomeToggle}
                disabled={isPlaying || isRecording}
              />
            </div>
            
            {metronomeEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Volume
                  </label>
                  <span className="text-sm">{Math.round(metronomeVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={metronomeVolume}
                  onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Solfege Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Show Solfege</label>
            <Switch
              checked={solfegeEnabled}
              onCheckedChange={onSolfegeToggle}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};