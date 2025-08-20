import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Music, Play, Square, Download, Save } from 'lucide-react';
import { VirtualPiano } from '@/components/sight-singing/VirtualPiano';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExerciseSettings {
  keySignature: string;
  timeSignature: string;
  difficulty: string;
  tempo: number;
  length: string;
}

export const SightSingingGenerator: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [generatedExercise, setGeneratedExercise] = useState<any>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const [settings, setSettings] = useState<ExerciseSettings>({
    keySignature: 'C major',
    timeSignature: '4/4',
    difficulty: 'beginner',
    tempo: 120,
    length: 'short'
  });

  const generateExercise = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate exercises.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Call the generate-musicxml edge function
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: {
          keySignature: settings.keySignature,
          timeSignature: settings.timeSignature,
          difficulty: settings.difficulty,
          tempo: settings.tempo,
          length: settings.length
        }
      });

      if (error) throw error;

      setGeneratedExercise(data);
      toast({
        title: "Exercise Generated!",
        description: "Your sight singing exercise is ready. You can now practice and record your performance."
      });
    } catch (error) {
      console.error('Error generating exercise:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate exercise. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Sing the exercise. Click stop when finished."
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check your microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      
      toast({
        title: "Recording Stopped",
        description: "Your performance has been recorded. You can now save it."
      });
    }
  };

  const saveRecording = async () => {
    if (!audioBlob || !generatedExercise || !user) return;

    try {
      // Upload audio to storage
      const fileName = `recordings/${user.id}/${Date.now()}.wav`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('music-fundamentals')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('music-fundamentals')
        .getPublicUrl(fileName);

      // Save to sight_singing_recordings table (using user_id as the correct column name)
      const { error: saveError } = await supabase
        .from('sight_singing_recordings')
        .insert({
          user_id: user.id,
          exercise_id: generatedExercise.id || `exercise_${Date.now()}`,
          audio_file_path: publicUrl
        });

      if (saveError) throw saveError;

      toast({
        title: "Recording Saved!",
        description: "Your sight singing performance has been saved for review."
      });

      setAudioBlob(null);
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Exercise Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exercise Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key-signature">Key Signature</Label>
              <Select 
                value={settings.keySignature} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, keySignature: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C major">C Major</SelectItem>
                  <SelectItem value="G major">G Major</SelectItem>
                  <SelectItem value="D major">D Major</SelectItem>
                  <SelectItem value="A major">A Major</SelectItem>
                  <SelectItem value="F major">F Major</SelectItem>
                  <SelectItem value="Bb major">B♭ Major</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-signature">Time Signature</Label>
              <Select 
                value={settings.timeSignature} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, timeSignature: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4/4">4/4</SelectItem>
                  <SelectItem value="3/4">3/4</SelectItem>
                  <SelectItem value="2/4">2/4</SelectItem>
                  <SelectItem value="6/8">6/8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select 
                value={settings.difficulty} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempo">Tempo (BPM)</Label>
              <Select 
                value={settings.tempo.toString()} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, tempo: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tempo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">80 BPM (Slow)</SelectItem>
                  <SelectItem value="100">100 BPM</SelectItem>
                  <SelectItem value="120">120 BPM (Moderate)</SelectItem>
                  <SelectItem value="140">140 BPM</SelectItem>
                  <SelectItem value="160">160 BPM (Fast)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="length">Exercise Length</Label>
              <Select 
                value={settings.length} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, length: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (4 measures)</SelectItem>
                  <SelectItem value="medium">Medium (8 measures)</SelectItem>
                  <SelectItem value="long">Long (16 measures)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateExercise} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Music className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Generate Exercise
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Exercise Display */}
      {generatedExercise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Exercise</span>
              <div className="flex gap-2">
                <Badge variant="secondary">{settings.keySignature}</Badge>
                <Badge variant="secondary">{settings.timeSignature}</Badge>
                <Badge variant="outline">{settings.difficulty}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Music notation would be displayed here */}
              <div className="bg-muted/30 p-8 rounded-lg border-2 border-dashed border-muted-foreground/20 text-center">
                <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Music notation will be displayed here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {settings.keySignature} • {settings.timeSignature} • {settings.tempo} BPM
                </p>
              </div>

              {/* Recording Controls */}
              <div className="flex gap-4 justify-center">
                {!isRecording ? (
                  <Button onClick={startRecording} variant="default">
                    <Play className="mr-2 h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive">
                    <Square className="mr-2 h-4 w-4" />
                    Stop Recording
                  </Button>
                )}

                {audioBlob && (
                  <Button onClick={saveRecording} variant="secondary">
                    <Save className="mr-2 h-4 w-4" />
                    Save Recording
                  </Button>
                )}
              </div>

              {/* Audio Playback */}
              {audioBlob && (
                <div className="text-center">
                  <audio 
                    controls 
                    src={URL.createObjectURL(audioBlob)}
                    className="mx-auto"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Review your recording before saving
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Virtual Piano for reference */}
      <VirtualPiano />
    </div>
  );
};