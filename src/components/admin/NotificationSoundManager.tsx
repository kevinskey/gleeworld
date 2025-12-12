import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Volume2, Play, RefreshCw, Trash2, Loader2, Music } from 'lucide-react';

interface SoundConfig {
  type: string;
  label: string;
  defaultPrompt: string;
  defaultDuration: number;
}

const SOUND_CONFIGS: SoundConfig[] = [
  {
    type: 'poll',
    label: 'New Poll',
    defaultPrompt: 'Gentle musical chime with rising tones, friendly voting notification sound, short and pleasant',
    defaultDuration: 1.5,
  },
  {
    type: 'message',
    label: 'New Message',
    defaultPrompt: 'Soft melodic ping, friendly conversational notification, subtle and warm',
    defaultDuration: 1,
  },
  {
    type: 'announcement',
    label: 'Announcement',
    defaultPrompt: 'Attention-getting bell tone with musical flourish, important broadcast notification, clear and professional',
    defaultDuration: 2,
  },
  {
    type: 'success',
    label: 'Success',
    defaultPrompt: 'Uplifting musical flourish, positive achievement sound, bright and celebratory',
    defaultDuration: 1.5,
  },
  {
    type: 'warning',
    label: 'Warning',
    defaultPrompt: 'Cautionary low tone, gentle alert sound, subtle but noticeable',
    defaultDuration: 1.5,
  },
];

interface ExistingSound {
  id: string;
  sound_type: string;
  storage_path: string;
  prompt_used: string | null;
  duration_seconds: number | null;
}

export const NotificationSoundManager = () => {
  const [existingSounds, setExistingSounds] = useState<ExistingSound[]>([]);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExistingSounds();
    // Initialize prompts and durations from configs
    const initialPrompts: Record<string, string> = {};
    const initialDurations: Record<string, number> = {};
    SOUND_CONFIGS.forEach((config) => {
      initialPrompts[config.type] = config.defaultPrompt;
      initialDurations[config.type] = config.defaultDuration;
    });
    setPrompts(initialPrompts);
    setDurations(initialDurations);
  }, []);

  const loadExistingSounds = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_sounds')
        .select('*');

      if (error) throw error;
      setExistingSounds(data || []);

      // Update prompts with existing values
      data?.forEach((sound) => {
        if (sound.prompt_used) {
          setPrompts((prev) => ({ ...prev, [sound.sound_type]: sound.prompt_used! }));
        }
        if (sound.duration_seconds) {
          setDurations((prev) => ({ ...prev, [sound.sound_type]: sound.duration_seconds! }));
        }
      });
    } catch (error) {
      console.error('Error loading sounds:', error);
      toast.error('Failed to load existing sounds');
    } finally {
      setLoading(false);
    }
  };

  const generateSound = async (soundType: string) => {
    const prompt = prompts[soundType];
    const duration = durations[soundType];

    if (!prompt) {
      toast.error('Please enter a prompt');
      return;
    }

    setGenerating(soundType);

    try {
      // Call edge function to generate sound
      const { data, error } = await supabase.functions.invoke('elevenlabs-sfx', {
        body: { prompt, duration },
      });

      if (error) throw error;

      // Convert response to blob
      const audioBlob = new Blob([data], { type: 'audio/mpeg' });
      const fileName = `${soundType}-${Date.now()}.mp3`;

      // Delete old sound if exists
      const existingSound = existingSounds.find((s) => s.sound_type === soundType);
      if (existingSound) {
        await supabase.storage
          .from('notification-sounds')
          .remove([existingSound.storage_path]);
        
        await supabase
          .from('notification_sounds')
          .delete()
          .eq('id', existingSound.id);
      }

      // Upload new sound
      const { error: uploadError } = await supabase.storage
        .from('notification-sounds')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Save to database
      const { error: dbError } = await supabase
        .from('notification_sounds')
        .insert({
          sound_type: soundType,
          storage_path: fileName,
          prompt_used: prompt,
          duration_seconds: duration,
        });

      if (dbError) throw dbError;

      toast.success(`${SOUND_CONFIGS.find((c) => c.type === soundType)?.label} sound generated!`);
      loadExistingSounds();

      // Auto-preview the new sound
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Error generating sound:', error);
      toast.error('Failed to generate sound');
    } finally {
      setGenerating(null);
    }
  };

  const previewSound = async (soundType: string) => {
    const existingSound = existingSounds.find((s) => s.sound_type === soundType);
    if (!existingSound) {
      toast.error('No sound to preview');
      return;
    }

    try {
      const { data: urlData } = supabase.storage
        .from('notification-sounds')
        .getPublicUrl(existingSound.storage_path);

      if (previewAudio) {
        previewAudio.pause();
      }

      const audio = new Audio(urlData.publicUrl);
      setPreviewAudio(audio);
      audio.play();
    } catch (error) {
      console.error('Error previewing sound:', error);
      toast.error('Failed to preview sound');
    }
  };

  const deleteSound = async (soundType: string) => {
    const existingSound = existingSounds.find((s) => s.sound_type === soundType);
    if (!existingSound) return;

    try {
      await supabase.storage
        .from('notification-sounds')
        .remove([existingSound.storage_path]);

      await supabase
        .from('notification_sounds')
        .delete()
        .eq('id', existingSound.id);

      toast.success('Sound deleted');
      loadExistingSounds();
    } catch (error) {
      console.error('Error deleting sound:', error);
      toast.error('Failed to delete sound');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Notification Sound Manager
        </CardTitle>
        <CardDescription>
          Generate custom notification sounds using ElevenLabs AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {SOUND_CONFIGS.map((config) => {
          const existingSound = existingSounds.find((s) => s.sound_type === config.type);
          const isGenerating = generating === config.type;

          return (
            <div key={config.type} className="space-y-3 p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">{config.label}</Label>
                  {existingSound && (
                    <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                      Generated
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {existingSound && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewSound(config.type)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSound(config.type)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Sound Description</Label>
                <Input
                  value={prompts[config.type] || ''}
                  onChange={(e) =>
                    setPrompts((prev) => ({ ...prev, [config.type]: e.target.value }))
                  }
                  placeholder="Describe the sound you want..."
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Duration: {durations[config.type]?.toFixed(1)}s
                </Label>
                <Slider
                  value={[durations[config.type] || config.defaultDuration]}
                  onValueChange={([value]) =>
                    setDurations((prev) => ({ ...prev, [config.type]: value }))
                  }
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <Button
                onClick={() => generateSound(config.type)}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : existingSound ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Sound
                  </>
                ) : (
                  <>
                    <Music className="h-4 w-4 mr-2" />
                    Generate Sound
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
