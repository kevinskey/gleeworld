import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  Volume2, 
  Music, 
  Sparkles, 
  MessageCircle, 
  FileAudio, 
  Play, 
  Pause, 
  Square, 
  Upload,
  Download,
  Loader2,
  Wand2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VoiceConversationAgent from '@/components/assistant/VoiceConversationAgent';

// Voice options for TTS
const VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
];

export const TheLabModule: React.FC = () => {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Wand2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">The Lab</CardTitle>
            <CardDescription>ElevenLabs AI Voice & Audio Tools</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tts" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="tts" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">Text to Speech</span>
              <span className="sm:hidden">TTS</span>
            </TabsTrigger>
            <TabsTrigger value="conversation" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Voice Agent</span>
              <span className="sm:hidden">Agent</span>
            </TabsTrigger>
            <TabsTrigger value="transcribe" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Transcribe</span>
              <span className="sm:hidden">STT</span>
            </TabsTrigger>
            <TabsTrigger value="sfx" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Sound FX</span>
              <span className="sm:hidden">SFX</span>
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Music</span>
              <span className="sm:hidden">Music</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tts">
            <TextToSpeechTab />
          </TabsContent>

          <TabsContent value="conversation">
            <VoiceAgentTab />
          </TabsContent>

          <TabsContent value="transcribe">
            <TranscribeTab />
          </TabsContent>

          <TabsContent value="sfx">
            <SoundEffectsTab />
          </TabsContent>

          <TabsContent value="music">
            <MusicGenerationTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Text to Speech Tab
const TextToSpeechTab: React.FC = () => {
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [stability, setStability] = useState([0.5]);
  const [similarity, setSimilarity] = useState([0.75]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateSpeech = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to convert');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text,
            voiceId,
            stability: stability[0],
            similarity_boost: similarity[0]
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      toast.success('Speech generated!');
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Failed to generate speech');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label>Text to Convert</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to convert to speech..."
            className="min-h-[120px] mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">{text.length}/5000 characters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Voice</Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Stability: {stability[0].toFixed(2)}</Label>
              <Slider
                value={stability}
                onValueChange={setStability}
                min={0}
                max={1}
                step={0.05}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Similarity: {similarity[0].toFixed(2)}</Label>
              <Slider
                value={similarity}
                onValueChange={setSimilarity}
                min={0}
                max={1}
                step={0.05}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <Button onClick={generateSpeech} disabled={isGenerating || !text.trim()}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 mr-2" />
              Generate Speech
            </>
          )}
        </Button>

        {audioUrl && (
          <div className="p-4 bg-muted rounded-lg">
            <audio controls src={audioUrl} className="w-full" />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.download = 'speech.mp3';
                a.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Voice Agent Tab
const VoiceAgentTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">Voice Conversation Agent</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Have a natural voice conversation with our AI assistant. Click the button below to start talking.
        </p>
      </div>
      <VoiceConversationAgent />
    </div>
  );
};

// Transcription Tab
const TranscribeTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<any>(null);
  const [diarize, setDiarize] = useState(true);
  const [tagEvents, setTagEvents] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const transcribeAudio = async () => {
    if (!file) {
      toast.error('Please select an audio file');
      return;
    }

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('diarize', String(diarize));
      formData.append('tag_audio_events', String(tagEvents));

      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: formData
      });

      if (error) throw error;

      setTranscript(data);
      toast.success('Transcription complete!');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <FileAudio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <Input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="max-w-xs mx-auto"
          />
          {file && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {file.name}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={diarize}
              onChange={(e) => setDiarize(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Speaker Diarization</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tagEvents}
              onChange={(e) => setTagEvents(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Tag Audio Events</span>
          </label>
        </div>

        <Button onClick={transcribeAudio} disabled={isTranscribing || !file}>
          {isTranscribing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Transcribing...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Transcribe Audio
            </>
          )}
        </Button>

        {transcript && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {transcript.words ? (
                  <div className="space-y-2">
                    {transcript.words.map((word: any, i: number) => (
                      <span key={i} className="inline">
                        {word.speaker && (
                          <Badge variant="outline" className="mr-1 text-xs">
                            {word.speaker}
                          </Badge>
                        )}
                        {word.text}{' '}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>{transcript.text}</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Sound Effects Tab
const SoundEffectsTab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([5]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateSFX = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the sound effect');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt, duration: duration[0] }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate sound effect');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      toast.success('Sound effect generated!');
    } catch (error) {
      console.error('SFX error:', error);
      toast.error('Failed to generate sound effect');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label>Describe the Sound Effect</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Thunder rumbling in the distance, a car horn honking..."
            className="min-h-[100px] mt-2"
          />
        </div>

        <div>
          <Label>Duration: {duration[0]} seconds</Label>
          <Slider
            value={duration}
            onValueChange={setDuration}
            min={0.5}
            max={22}
            step={0.5}
            className="mt-2"
          />
        </div>

        <Button onClick={generateSFX} disabled={isGenerating || !prompt.trim()}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Sound Effect
            </>
          )}
        </Button>

        {audioUrl && (
          <div className="p-4 bg-muted rounded-lg">
            <audio controls src={audioUrl} className="w-full" />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.download = 'sound-effect.mp3';
                a.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Music Generation Tab
const MusicGenerationTab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([30]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateMusic = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the music');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt, duration: duration[0] }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.suggestion) {
          toast.error(`Content policy issue. Try: "${errorData.suggestion.substring(0, 100)}..."`);
          setPrompt(errorData.suggestion);
        } else {
          throw new Error(errorData.error || 'Failed to generate music');
        }
        return;
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      toast.success('Music generated!');
    } catch (error) {
      console.error('Music error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label>Describe the Music</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Upbeat jazz with piano and saxophone, calm ambient electronic..."
            className="min-h-[100px] mt-2"
          />
        </div>

        <div>
          <Label>Duration: {duration[0]} seconds</Label>
          <Slider
            value={duration}
            onValueChange={setDuration}
            min={10}
            max={120}
            step={5}
            className="mt-2"
          />
        </div>

        <Button onClick={generateMusic} disabled={isGenerating || !prompt.trim()}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Music className="h-4 w-4 mr-2" />
              Generate Music
            </>
          )}
        </Button>

        {audioUrl && (
          <div className="p-4 bg-muted rounded-lg">
            <audio controls src={audioUrl} className="w-full" />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.download = 'generated-music.mp3';
                a.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TheLabModule;
