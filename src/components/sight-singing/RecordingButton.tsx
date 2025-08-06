import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

interface RecordingButtonProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export const RecordingButton: React.FC<RecordingButtonProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  disabled = false
}) => {
  if (isRecording) {
    return (
      <Button 
        onClick={onStopRecording}
        variant="outline" 
        className="flex items-center gap-2 border-red-600 text-red-600 hover:bg-red-50"
        disabled={disabled}
      >
        <Square className="h-4 w-4" />
        Stop Recording
      </Button>
    );
  }

  return (
    <Button 
      onClick={onStartRecording} 
      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
      disabled={disabled}
    >
      <Mic className="h-4 w-4" />
      Start Recording
    </Button>
  );
};