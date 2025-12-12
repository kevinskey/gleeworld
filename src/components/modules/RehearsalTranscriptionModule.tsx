import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileAudio, 
  Loader2, 
  User, 
  Clock, 
  Download,
  Mic,
  Copy,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TranscriptionWord {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

interface AudioEvent {
  type: string;
  start: number;
  end: number;
}

interface TranscriptionResult {
  text: string;
  words?: TranscriptionWord[];
  audio_events?: AudioEvent[];
}

interface RehearsalTranscription {
  id: string;
  filename: string;
  transcription: TranscriptionResult;
  createdAt: Date;
}

export const RehearsalTranscriptionModule = () => {
  const [transcriptions, setTranscriptions] = useState<RehearsalTranscription[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [selectedTranscription, setSelectedTranscription] = useState<RehearsalTranscription | null>(null);
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/ogg'];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
      toast.error('Please upload an audio file (MP3, WAV, M4A, WebM, OGG)');
      return;
    }

    setIsTranscribing(true);
    toast.info(`Transcribing ${file.name}...`, { duration: 10000 });

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('diarize', enableDiarization.toString());
      formData.append('language_code', 'eng');

      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: formData,
      });

      if (error) throw error;

      const result: RehearsalTranscription = {
        id: crypto.randomUUID(),
        filename: file.name,
        transcription: data,
        createdAt: new Date(),
      };

      setTranscriptions(prev => [result, ...prev]);
      setSelectedTranscription(result);
      toast.success('Transcription complete!');
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast.error(error.message || 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  }, [enableDiarization]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm', '.ogg'],
    },
    maxFiles: 1,
    disabled: isTranscribing,
  });

  const copyToClipboard = async () => {
    if (!selectedTranscription) return;
    
    await navigator.clipboard.writeText(selectedTranscription.transcription.text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTranscript = () => {
    if (!selectedTranscription) return;

    let content = `Transcription: ${selectedTranscription.filename}\n`;
    content += `Date: ${selectedTranscription.createdAt.toLocaleString()}\n\n`;
    content += `--- Full Text ---\n${selectedTranscription.transcription.text}\n\n`;

    if (selectedTranscription.transcription.words?.length) {
      content += `--- Word Timestamps ---\n`;
      
      // Group by speaker if diarization was enabled
      const speakers = new Map<string, TranscriptionWord[]>();
      selectedTranscription.transcription.words.forEach(word => {
        const speaker = word.speaker || 'Unknown';
        if (!speakers.has(speaker)) {
          speakers.set(speaker, []);
        }
        speakers.get(speaker)!.push(word);
      });

      if (speakers.size > 1) {
        speakers.forEach((words, speaker) => {
          content += `\n[${speaker}]\n`;
          words.forEach(w => {
            content += `${formatTime(w.start)} - ${w.text}\n`;
          });
        });
      } else {
        selectedTranscription.transcription.words.forEach(w => {
          content += `${formatTime(w.start)} - ${w.text}\n`;
        });
      }
    }

    if (selectedTranscription.transcription.audio_events?.length) {
      content += `\n--- Audio Events ---\n`;
      selectedTranscription.transcription.audio_events.forEach(event => {
        content += `${formatTime(event.start)} - ${event.type}\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTranscription.filename.replace(/\.[^/.]+$/, '')}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker: string): string => {
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan'];
    const index = parseInt(speaker.replace(/\D/g, '') || '0') % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Rehearsal Transcription
          </CardTitle>
          <CardDescription>
            Upload rehearsal recordings to get AI-powered transcriptions with speaker labels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Speaker Diarization</Label>
              <p className="text-xs text-muted-foreground">
                Identify and label different speakers
              </p>
            </div>
            <Switch
              checked={enableDiarization}
              onCheckedChange={setEnableDiarization}
              disabled={isTranscribing}
            />
          </div>

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            {isTranscribing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Transcribing audio...</p>
                <p className="text-xs text-muted-foreground">This may take a minute</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">
                  {isDragActive ? 'Drop the audio file here' : 'Drag & drop an audio file'}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to select (MP3, WAV, M4A, WebM, OGG)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcription Results */}
      {transcriptions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Transcription List */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Recent Transcriptions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {transcriptions.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTranscription(t)}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors
                      ${selectedTranscription?.id === t.id ? 'bg-muted' : ''}
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <FileAudio className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(t.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Selected Transcription */}
          <Card className="lg:col-span-2">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {selectedTranscription?.filename || 'Select a transcription'}
                </CardTitle>
                {selectedTranscription && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTranscript}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedTranscription ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {/* Full Text */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Full Transcription</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedTranscription.transcription.text}
                      </p>
                    </div>

                    {/* Speaker Labels */}
                    {selectedTranscription.transcription.words?.some(w => w.speaker) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            By Speaker
                          </h4>
                          <div className="space-y-2">
                            {Array.from(new Set(selectedTranscription.transcription.words
                              .filter(w => w.speaker)
                              .map(w => w.speaker)
                            )).map(speaker => (
                              <div key={speaker} className="space-y-1">
                                <Badge variant="secondary" className={`text-${getSpeakerColor(speaker!)}-600`}>
                                  {speaker}
                                </Badge>
                                <p className="text-sm text-muted-foreground pl-2">
                                  {selectedTranscription.transcription.words
                                    ?.filter(w => w.speaker === speaker)
                                    .map(w => w.text)
                                    .join(' ')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Audio Events */}
                    {selectedTranscription.transcription.audio_events?.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium mb-2">Audio Events</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedTranscription.transcription.audio_events.map((event, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(event.start)} - {event.type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Select a transcription to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RehearsalTranscriptionModule;
