import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RefreshCw, Music, Bug, Download, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Exact data contract schema
const formSchema = z.object({
  key: z.enum(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Db', 'Eb', 'Gb', 'Ab', 'Bb']),
  mode: z.enum(['Major', 'Minor', 'Natural Minor', 'Harmonic Minor', 'Melodic Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian']),
  timeSignature: z.enum(['2/4', '3/4', '4/4', '6/8', '9/8']),
  measures: z.number().refine(val => [4, 8, 16, 32].includes(val)),
  voiceParts: z.enum(['S', 'A', 'SA']),
  bpm: z.number().refine(val => [60, 72, 84, 96, 108, 120, 132, 144, 160, 180].includes(val)),
  noteValues: z.array(z.enum(['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond'])).min(1),
  restValues: z.array(z.enum(['WR', 'HR', 'QR', '8R', '16R', '32R'])).min(1),
  dottedNotes: z.boolean(),
  cadenceFrequency: z.number().refine(val => [2, 4, 8].includes(val)),
  cadenceTypes: z.array(z.enum(['Authentic', 'Half', 'Plagal', 'Deceptive'])).min(1),
  motionTypes: z.array(z.enum(['Step', 'Skip', 'Leap', 'Repeat'])).min(1),
  voiceLeading: z.boolean(),
  resolveTendencies: z.boolean(),
  strongBeatCadence: z.boolean(),
  maxInterval: z.number().min(1).max(12),
  stepwiseMotionPercent: z.number().min(0).max(100),
  forceRefresh: z.boolean(),
  debugEcho: z.boolean()
});

type FormData = z.infer<typeof formSchema>;

interface ParameterFormNewProps {
  onMusicXMLGenerated: (musicxml: string, params: FormData) => void;
  onReset: () => void;
}

export const ParameterFormNew: React.FC<ParameterFormNewProps> = ({ 
  onMusicXMLGenerated, 
  onReset 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasExercise, setHasExercise] = useState(false);
  const [sentParams, setSentParams] = useState<FormData | null>(null);
  const [modelEcho, setModelEcho] = useState<FormData | null>(null);
  const [echoMatches, setEchoMatches] = useState<boolean | null>(null);
  const [currentMusicXML, setCurrentMusicXML] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "C",
      mode: "Major", 
      timeSignature: "4/4",
      measures: 8,
      voiceParts: "S",
      bpm: 120,
      noteValues: ["quarter"],
      restValues: ["QR"],
      dottedNotes: false,
      cadenceFrequency: 4,
      cadenceTypes: ["Authentic"],
      motionTypes: ["Step", "Skip"],
      voiceLeading: true,
      resolveTendencies: true,
      strongBeatCadence: true,
      maxInterval: 7,
      stepwiseMotionPercent: 70,
      forceRefresh: false,
      debugEcho: false
    }
  });

  const handleSubmit = async (data: FormData) => {
    console.log('Form submitted with:', data);
    setIsGenerating(true);
    setSentParams(data);
    setModelEcho(null);
    setEchoMatches(null);

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-score', {
        body: data
      });

      if (error) {
        console.error('Error generating score:', error);
        toast.error(`Failed to generate score: ${error.message}`);
        return;
      }

      console.log('Score generation result:', result);
      
      if (result.error) {
        toast.error(`Score generation failed: ${result.error}`);
        if (result.error === 'echo mismatch') {
          setModelEcho(result.received);
          setEchoMatches(false);
        }
        return;
      }

      if (result.success && result.musicxml) {
        setModelEcho(result.echo);
        setEchoMatches(true);
        setHasExercise(true);
        setCurrentMusicXML(result.musicxml);
        onMusicXMLGenerated(result.musicxml, data);
        toast.success('Score generated successfully!');
      }

    } catch (error) {
      console.error('Error calling generate-score function:', error);
      toast.error('Failed to generate score. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    form.reset();
    setHasExercise(false);
    setSentParams(null);
    setModelEcho(null);
    setEchoMatches(null);
    setCurrentMusicXML('');
    onReset();
  };

  const downloadMusicXML = () => {
    if (!currentMusicXML || !sentParams) return;
    
    const blob = new Blob([currentMusicXML], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sight-reading-${sentParams.key}-${sentParams.mode}-${sentParams.measures}m.musicxml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Score Generator Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Db', 'Eb', 'Gb', 'Ab', 'Bb'].map((key) => (
                          <SelectItem key={key} value={key}>{key}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['Major', 'Minor', 'Natural Minor', 'Harmonic Minor', 'Melodic Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'].map((mode) => (
                          <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="timeSignature" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Signature</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['2/4', '3/4', '4/4', '6/8', '9/8'].map((ts) => (
                          <SelectItem key={ts} value={ts}>{ts}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="measures" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Measures</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[4, 8, 16, 32].map((num) => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              {/* Voice Parts and BPM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="voiceParts" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voice Parts</FormLabel>
                    <FormControl>
                      <ToggleGroup type="single" value={field.value} onValueChange={field.onChange}>
                        <ToggleGroupItem value="S">Soprano (S)</ToggleGroupItem>
                        <ToggleGroupItem value="A">Alto (A)</ToggleGroupItem>
                        <ToggleGroupItem value="SA">Soprano + Alto (SA)</ToggleGroupItem>
                      </ToggleGroup>
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="bpm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>BPM</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[60, 72, 84, 96, 108, 120, 132, 144, 160, 180].map((bpm) => (
                          <SelectItem key={bpm} value={bpm.toString()}>{bpm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button type="submit" disabled={isGenerating} className="flex-1">
                  {isGenerating ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Music className="h-4 w-4 mr-2" />🎵 Generate Exercise</>
                  )}
                </Button>
                
                {hasExercise && (
                  <>
                    <Button type="button" variant="outline" onClick={handleReset}>
                      <RefreshCw className="h-4 w-4 mr-2" />🔄 Reset
                    </Button>
                    <Button type="button" variant="outline" onClick={downloadMusicXML}>
                      <Download className="h-4 w-4 mr-2" />Download MusicXML
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Parameters Sent Card */}
      {sentParams && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Parameters Sent</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
              {JSON.stringify(sentParams, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Debug Echo Card */}
      {sentParams?.debugEcho && modelEcho && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />Model Echo
              {echoMatches !== null && (
                echoMatches ? (
                  <span className="flex items-center gap-1 text-green-600"><Check className="h-4 w-4" />Match ✓</span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600"><X className="h-4 w-4" />Mismatch ✗</span>
                )
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
              {JSON.stringify(modelEcho, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};