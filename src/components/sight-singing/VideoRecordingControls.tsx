// UI for capturing a video submission. Shows a live preview while
// recording, a playback preview after stop, and Start/Stop/Clear actions.
// Mirrors the audio RecordingControls API so it drops into the same
// surfaces that already render audio recording.

import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, Square, X } from 'lucide-react';

interface VideoRecordingControlsProps {
  isRecording: boolean;
  duration: number;
  hasRecording: boolean;
  previewUrl: string | null;
  previewRef: React.MutableRefObject<HTMLVideoElement | null>;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VideoRecordingControls: React.FC<VideoRecordingControlsProps> = ({
  isRecording,
  duration,
  hasRecording,
  previewUrl,
  previewRef,
  onStartRecording,
  onStopRecording,
  onClearRecording,
}) => {
  return (
    <div className="space-y-4">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
        {/* Live preview while recording */}
        <video
          ref={previewRef}
          className={isRecording ? 'w-full h-full object-cover' : 'hidden'}
          autoPlay
          playsInline
          muted
        />
        {/* Playback preview after stop */}
        {!isRecording && previewUrl && (
          <video
            src={previewUrl}
            className="w-full h-full object-contain bg-black"
            controls
            playsInline
          />
        )}
        {/* Empty state */}
        {!isRecording && !previewUrl && (
          <div className="text-center text-slate-300">
            <Video className="w-10 h-10 mx-auto mb-2 opacity-60" />
            <p className="text-sm">Tap Record to start a video submission.</p>
          </div>
        )}
        {/* Recording badge */}
        {isRecording && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-white text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            REC {formatDuration(duration)}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isRecording && !hasRecording && (
          <Button onClick={onStartRecording} className="flex-1">
            <Video className="w-4 h-4 mr-2" /> Record video
          </Button>
        )}
        {isRecording && (
          <Button onClick={onStopRecording} variant="destructive" className="flex-1">
            <Square className="w-4 h-4 mr-2" /> Stop
          </Button>
        )}
        {!isRecording && hasRecording && (
          <>
            <Button onClick={onStartRecording} variant="outline" className="flex-1">
              <Video className="w-4 h-4 mr-2" /> Re-record
            </Button>
            <Button onClick={onClearRecording} variant="ghost">
              <X className="w-4 h-4 mr-2" /> Clear
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
