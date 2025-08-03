import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Mic, Download, Play, Pause, Sparkles, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Commercial {
  id: string;
  title: string;
  script: string;
  duration: number;
  voice: string;
  audioUrl?: string;
  createdAt: Date;
}

interface CommercialMakerProps {
  onCommercialCreated: (commercial: Commercial) => void;
}

export const CommercialMaker = ({ onCommercialCreated }: CommercialMakerProps) => {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [duration, setDuration] = useState('30');
  const [tone, setTone] = useState('professional');
  const [voice, setVoice] = useState('alloy');
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const generateScript = async () => {
    if (!businessName || !businessType || !keyMessage) {
      toast.error('Please fill in business name, type, and key message');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Sending request to generate commercial script...');
      const { data, error } = await supabase.functions.invoke('generate-commercial-script', {
        body: {
          businessName,
          businessType,
          keyMessage,
          targetAudience,
          duration: parseInt(duration),
          tone
        }
      });

      console.log('Response received:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      if (!data?.script) {
        console.error('No script in response:', data);
        throw new Error('No script generated');
      }

      setGeneratedScript(data.script);
      toast.success('Commercial script generated!');
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error(`Failed to generate script: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAudio = async () => {
    if (!generatedScript) {
      toast.error('Please generate a script first');
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-commercial-audio', {
        body: {
          script: generatedScript,
          voice
        }
      });

      if (error) throw error;

      // Create audio blob from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], 
        { type: 'audio/mpeg' }
      );
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      toast.success('Commercial audio generated!');
    } catch (error) {
      console.error('Error generating audio:', error);
      toast.error('Failed to generate audio. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playAudio = () => {
    if (!audioUrl) return;

    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
      setIsPlaying(false);
    }

    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setAudioElement(audio);
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
  };

  const saveCommercial = () => {
    if (!generatedScript) {
      toast.error('Please generate a script first');
      return;
    }

    const commercial: Commercial = {
      id: crypto.randomUUID(),
      title: `${businessName} Commercial`,
      script: generatedScript,
      duration: parseInt(duration),
      voice,
      audioUrl,
      createdAt: new Date()
    };

    onCommercialCreated(commercial);
    toast.success('Commercial saved!');
    
    // Reset form
    setBusinessName('');
    setBusinessType('');
    setKeyMessage('');
    setTargetAudience('');
    setGeneratedScript('');
    setAudioUrl(null);
    setIsPlaying(false);
  };

  const downloadAudio = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${businessName}-commercial.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Commercial Maker
          <Badge variant="secondary">Powered by AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Business Name *</label>
            <Input
              placeholder="e.g., Joe's Pizza Palace"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Business Type *</label>
            <Input
              placeholder="e.g., Restaurant, Auto Shop, Salon"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="energetic">Energetic</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="humorous">Humorous</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Key Message *</label>
          <Textarea
            placeholder="What do you want to communicate? e.g., Grand opening sale, New location, Special offer"
            value={keyMessage}
            onChange={(e) => setKeyMessage(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Target Audience</label>
          <Input
            placeholder="e.g., Families, Young professionals, Local community"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />
        </div>

        <Button 
          onClick={generateScript} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating Script...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Commercial Script
            </>
          )}
        </Button>

        {/* Generated Script */}
        {generatedScript && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Generated Script</h3>
              <ScrollArea className="h-32 w-full rounded-md border p-4">
                <p className="text-sm whitespace-pre-wrap">{generatedScript}</p>
              </ScrollArea>
              
              {/* Voice Selection and Audio Generation */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Voice</label>
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                      <SelectItem value="echo">Echo (Male)</SelectItem>
                      <SelectItem value="fable">Fable (British Male)</SelectItem>
                      <SelectItem value="onyx">Onyx (Deep Male)</SelectItem>
                      <SelectItem value="nova">Nova (Female)</SelectItem>
                      <SelectItem value="shimmer">Shimmer (Soft Female)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={generateAudio} 
                  disabled={isGeneratingAudio}
                  variant="outline"
                >
                  {isGeneratingAudio ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Generate Audio
                    </>
                  )}
                </Button>
              </div>

              {/* Audio Controls */}
              {audioUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={isPlaying ? pauseAudio : playAudio}
                    variant="outline"
                    size="sm"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={downloadAudio}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Commercial audio ready
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={saveCommercial} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Save Commercial
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};