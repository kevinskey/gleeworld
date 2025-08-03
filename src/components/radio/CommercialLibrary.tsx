import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Download, Trash2, Radio, Clock, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface Commercial {
  id: string;
  title: string;
  script: string;
  duration: number;
  voice: string;
  audioUrl?: string;
  createdAt: Date;
}

interface CommercialLibraryProps {
  commercials: Commercial[];
  onCommercialDelete: (id: string) => void;
  onCommercialPlay: (commercial: Commercial) => void;
  onAddToTimeline: (commercial: Commercial) => void;
}

export const CommercialLibrary = ({ 
  commercials, 
  onCommercialDelete, 
  onCommercialPlay,
  onAddToTimeline 
}: CommercialLibraryProps) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    // Cleanup audio elements on unmount
    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      });
    };
  }, [audioElements]);

  const playCommercial = (commercial: Commercial) => {
    if (!commercial.audioUrl) {
      toast.error('No audio available for this commercial');
      return;
    }

    // Stop any currently playing audio
    if (playingId && audioElements.has(playingId)) {
      const currentAudio = audioElements.get(playingId);
      currentAudio?.pause();
    }

    if (playingId === commercial.id) {
      setPlayingId(null);
      return;
    }

    let audio = audioElements.get(commercial.id);
    if (!audio) {
      audio = new Audio(commercial.audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        toast.error('Failed to play audio');
        setPlayingId(null);
      };
      setAudioElements(prev => new Map(prev.set(commercial.id, audio!)));
    }

    audio.play().then(() => {
      setPlayingId(commercial.id);
      onCommercialPlay(commercial);
    }).catch(() => {
      toast.error('Failed to play audio');
      setPlayingId(null);
    });
  };

  const downloadCommercial = (commercial: Commercial) => {
    if (!commercial.audioUrl) {
      toast.error('No audio available for download');
      return;
    }

    const a = document.createElement('a');
    a.href = commercial.audioUrl;
    a.download = `${commercial.title.replace(/\s+/g, '-').toLowerCase()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const deleteCommercial = (commercial: Commercial) => {
    // Stop audio if playing
    if (playingId === commercial.id && audioElements.has(commercial.id)) {
      const audio = audioElements.get(commercial.id);
      audio?.pause();
      setPlayingId(null);
    }

    // Clean up audio element
    if (audioElements.has(commercial.id)) {
      const audio = audioElements.get(commercial.id);
      if (audio && commercial.audioUrl) {
        URL.revokeObjectURL(audio.src);
      }
      audioElements.delete(commercial.id);
    }

    onCommercialDelete(commercial.id);
    toast.success('Commercial deleted');
  };

  const addToTimeline = (commercial: Commercial) => {
    onAddToTimeline(commercial);
    toast.success(`Added "${commercial.title}" to radio timeline`);
  };

  const formatDuration = (seconds: number) => {
    return `${seconds}s`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (commercials.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Commercial Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No commercials created yet.</p>
            <p className="text-sm">Use the AI Commercial Maker to create your first commercial.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Commercial Library
          <Badge variant="outline">{commercials.length} commercials</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {commercials.map((commercial, index) => (
              <div key={commercial.id}>
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{commercial.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(commercial.duration)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Mic className="h-3 w-3 mr-1" />
                          {commercial.voice}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(commercial.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    <p className="line-clamp-3">{commercial.script}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {commercial.audioUrl && (
                      <Button
                        onClick={() => playCommercial(commercial)}
                        variant="outline"
                        size="sm"
                      >
                        {playingId === commercial.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    <Button
                      onClick={() => addToTimeline(commercial)}
                      size="sm"
                      variant="default"
                    >
                      <Radio className="h-4 w-4 mr-2" />
                      Add to Timeline
                    </Button>

                    {commercial.audioUrl && (
                      <Button
                        onClick={() => downloadCommercial(commercial)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      onClick={() => deleteCommercial(commercial)}
                      variant="outline"
                      size="sm"
                      className="ml-auto text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {index < commercials.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};