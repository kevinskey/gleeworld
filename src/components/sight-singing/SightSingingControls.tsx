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
    <div className="space-y-3">
      {/* Main Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={isPlaying ? onStopPractice : onStartPractice}
          disabled={isRecording}
          className="flex-1"
          size="sm"
        >
          {isPlaying ? (
            <>
              <Square className="h-3 w-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1" />
              Practice
            </>
          )}
        </Button>

        <Button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isPlaying}
          variant={isRecording ? "destructive" : "secondary"}
          className="flex-1"
          size="sm"
        >
          {isRecording ? (
            <>
              <MicOff className="h-3 w-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-3 w-3 mr-1" />
              Record
            </>
          )}
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="flex gap-1 justify-center flex-wrap">
        {isCountingDown && (
          <Badge variant="secondary" className="text-xs h-5">
            Count: {countdownBeats}/4
          </Badge>
        )}
        {isRecording && (
          <Badge variant="destructive" className="text-xs h-5">
            Recording: {formatTime(recordingTime)}
          </Badge>
        )}
        {isPlaying && (
          <Badge variant="default" className="text-xs h-5">
            Playing
          </Badge>
        )}
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        {/* Tempo Control */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-medium">Tempo</label>
            <span className="font-mono">{tempo}</span>
          </div>
          <input
            type="range"
            min="60"
            max="180"
            value={tempo}
            onChange={(e) => onTempoChange(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isPlaying || isRecording}
          />
        </div>

        {/* Metronome Toggle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-medium">Click</label>
            <Switch
              checked={metronomeEnabled}
              onCheckedChange={onMetronomeToggle}
              disabled={isPlaying || isRecording}
              className="scale-75"
            />
          </div>
          {metronomeEnabled && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={metronomeVolume}
              onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          )}
        </div>

        {/* Solfege Toggle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-medium">Solfege</label>
            <Switch
              checked={solfegeEnabled}
              onCheckedChange={onSolfegeToggle}
              className="scale-75"
            />
          </div>
        </div>
      </div>
    </div>
  );
};