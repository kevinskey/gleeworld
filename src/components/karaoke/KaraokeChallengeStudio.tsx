import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Mic, Share2, Download } from 'lucide-react';
import { useAudioRecorder } from '@/components/sight-singing/hooks/useAudioRecorder';
import { useKaraokeRecordings } from '@/hooks/useKaraokeRecordings';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const KaraokeChallengeStudio: React.FC = () => {
  const [mode, setMode] = useState<'menu' | 'practice' | 'record'>('menu');
  const [savedRecording, setSavedRecording] = useState<{ blob: Blob; url: string } | null>(null);
  const { isRecording, recordingDuration, audioBlob, startRecording, stopRecording, clearRecording } = useAudioRecorder();
  const { uploadRecording } = useKaraokeRecordings();
  const { toast } = useToast();
  const { user } = useAuth();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecord = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      clearRecording();
      setSavedRecording(null);
      await startRecording();
    }
  };

  const handleSaveRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setSavedRecording({ blob: audioBlob, url });
      toast({
        title: "Recording Saved",
        description: "Your recording is ready to share!",
      });
    }
  };

  const handleShare = async () => {
    if (!savedRecording || !user) {
      toast({
        title: "Error",
        description: "Please record something first and make sure you're logged in",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await uploadRecording(
        savedRecording.blob,
        "My Karaoke Performance",
        "A Choice to Change the World"
      );

      if (result.success) {
        toast({
          title: "Shared!",
          description: "Your karaoke recording has been posted!",
        });
        clearRecording();
        setSavedRecording(null);
        setMode('menu');
      }
    } catch (error) {
      console.error('Error sharing recording:', error);
      toast({
        title: "Error",
        description: "Failed to share recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (savedRecording) {
      const a = document.createElement('a');
      a.href = savedRecording.url;
      a.download = `karaoke-recording-${Date.now()}.webm`;
      a.click();
      toast({
        title: "Downloaded!",
        description: "Your recording has been downloaded.",
      });
    }
  };

  if (mode === 'menu') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-4">
          {/* Title */}
          <Card className="p-8 border-4 border-foreground bg-background">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-center leading-tight tracking-tight">
              <span className="inline-block text-outline-bold">A CHOICE</span>
              <br />
              <span className="inline-block text-outline-bold">TO CHANGE</span>
              <br />
              <span className="inline-block text-outline-bold">THE WORLD</span>
              <br />
              <span className="text-5xl sm:text-6xl md:text-7xl">KARAOKE</span>
              <br />
              <span className="text-5xl sm:text-6xl md:text-7xl">CHALLENGE</span>
            </h1>
          </Card>

          {/* Practice Button */}
          <Button
            onClick={() => setMode('practice')}
            className="w-full h-20 text-3xl font-black border-4 border-foreground bg-background text-foreground hover:bg-muted text-outline flex items-center justify-start px-8 gap-4"
            variant="outline"
          >
            <Play className="h-12 w-12 fill-destructive text-destructive" />
            <span className="text-outline">PRACTICE</span>
          </Button>

          {/* Record Button */}
          <Button
            onClick={() => setMode('record')}
            className="w-full h-20 text-3xl font-black border-4 border-foreground bg-background hover:bg-muted flex items-center justify-start px-8 gap-4"
            variant="outline"
          >
            <Play className="h-12 w-12 fill-destructive text-destructive" />
            <span className="text-destructive font-black text-outline-red">RECORD</span>
          </Button>

          {/* Share Button */}
          <Button
            onClick={handleShare}
            disabled={!savedRecording}
            className="w-full h-20 text-4xl border-4 border-foreground bg-background text-foreground hover:bg-muted font-script"
            variant="outline"
          >
            Share
          </Button>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={!savedRecording}
            className="w-full h-20 text-4xl border-4 border-foreground bg-background text-foreground hover:bg-muted font-script"
            variant="outline"
          >
            Download
          </Button>

          {/* Setup Button */}
          <Button
            className="w-full h-20 text-5xl font-black border-4 border-foreground bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            SETUP
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'record') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <Button
            onClick={() => setMode('menu')}
            variant="outline"
            className="mb-4"
          >
            ← Back to Menu
          </Button>

          <Card className="p-8 border-4 border-foreground">
            <h2 className="text-3xl font-black text-center mb-6 text-outline">RECORD MODE</h2>
            
            <div className="flex flex-col items-center gap-6">
              {/* Recording Duration */}
              <div className="text-6xl font-mono font-bold">
                {formatDuration(recordingDuration)}
              </div>

              {/* Record/Stop Button */}
              <Button
                onClick={handleRecord}
                size="lg"
                className={`h-24 w-24 rounded-full ${
                  isRecording 
                    ? 'bg-destructive hover:bg-destructive/90' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isRecording ? (
                  <div className="h-8 w-8 bg-white rounded-sm" />
                ) : (
                  <Mic className="h-12 w-12" />
                )}
              </Button>

              {/* Save Recording Button */}
              {audioBlob && !isRecording && (
                <Button
                  onClick={handleSaveRecording}
                  size="lg"
                  className="w-full text-xl font-bold"
                >
                  Save Recording
                </Button>
              )}

              {/* Audio Preview */}
              {savedRecording && (
                <div className="w-full">
                  <audio controls src={savedRecording.url} className="w-full" />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button
        onClick={() => setMode('menu')}
        variant="outline"
        className="mb-4"
      >
        ← Back to Menu
      </Button>
      <Card className="p-8">
        <h2 className="text-3xl font-black text-center text-outline">PRACTICE MODE</h2>
        <p className="text-center mt-4 text-muted-foreground">
          Practice mode coming soon...
        </p>
      </Card>
    </div>
  );
};
