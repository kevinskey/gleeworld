import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Music, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OSMDViewerProps {
  musicXML: string;
  title?: string;
}

const OSMDViewer: React.FC<OSMDViewerProps> = ({ musicXML, title }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const osmdRef = React.useRef<any>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (musicXML && containerRef.current) {
      renderMusicXML();
    }
  }, [musicXML]);

  const renderMusicXML = async () => {
    // Early exit if component is unmounted
    if (!isMountedRef.current) {
      console.log('Component unmounted, skipping render');
      return;
    }

    if (!containerRef.current || !musicXML) {
      console.log('renderMusicXML: Missing refs or musicXML', {
        hasContainer: !!containerRef.current,
        hasMusicXML: !!musicXML,
        isMounted: isMountedRef.current
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting OSMD rendering...');
      
      // Store container reference to prevent it from changing
      const container = containerRef.current;
      
      // Dynamic import of OSMD with better error handling
      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay').catch((importError) => {
        console.error('Failed to import OpenSheetMusicDisplay:', importError);
        throw new Error('Failed to load music notation library');
      });
      
      console.log('OSMD imported successfully');
      
      // Check again after async import
      if (!isMountedRef.current || !container) {
        console.log('Component state changed during import, aborting');
        return;
      }
      
      // Clear container safely
      container.innerHTML = '';
      
      // Create new OSMD instance
      osmdRef.current = new OpenSheetMusicDisplay(container, {
        autoResize: true,
        backend: 'svg',
        drawTitle: true,
        drawCredits: false,
        pageBackgroundColor: '#FFFFFF',
        pageFormat: 'A4_P',
        autoBeam: true,
        coloringMode: 0,
      });

      console.log('OSMD instance created');

      // Check mounting status before continuing
      if (!isMountedRef.current) {
        console.log('Component unmounted during OSMD creation, aborting');
        return;
      }

      console.log('Loading MusicXML directly...');
      
      // Load MusicXML directly without blob URLs to avoid CSP issues
      await osmdRef.current.loadXML(musicXML);
      
      // Final check before rendering
      if (!isMountedRef.current) {
        console.log('Component unmounted during loading, aborting');
        return;
      }
      
      console.log('Rendering sheet music...');
      osmdRef.current.render();
      
      console.log('MusicXML rendered successfully');
    } catch (err) {
      console.error('Error rendering MusicXML:', err);
      if (isMountedRef.current) {
        setError('Failed to render sheet music. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          {title || 'Generated Exercise'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Rendering sheet music...</span>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="min-h-[300px] w-full overflow-x-auto border rounded-lg bg-white p-4"
            style={{ minHeight: '300px' }}
          />
        )}
      </CardContent>
    </Card>
  );
};

const SightReadingGeneratorPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMusicXML, setGeneratedMusicXML] = useState<string>('');
  
  // Generation parameters
  const [difficulty, setDifficulty] = useState('beginner');
  const [keySignature, setKeySignature] = useState('C major');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [measures, setMeasures] = useState([8]);
  const [noteRange, setNoteRange] = useState('C4-C5');

  const validateMusicXML = (xml: string): boolean => {
    if (!xml || typeof xml !== 'string') return false;
    if (!xml.trim().startsWith('<?xml')) return false;
    if (!xml.includes('<score-partwise')) return false;
    if (!xml.includes('<note>')) return false;
    return true;
  };

  const testOpenAI = async () => {
    try {
      console.log('Testing OpenAI connection...');
      const { data, error } = await supabase.functions.invoke('test-openai', {
        body: { 
          prompt: "Generate a 4-bar melody in C major" 
        }
      });
      
      if (error) {
        console.error('Test function error:', error);
        toast({
          title: "Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('Test function response:', data);
      
      if (data.error) {
        toast({
          title: "OpenAI Test Failed",
          description: data.error,
          variant: "destructive"
        });
      } else if (data.success) {
        toast({
          title: "OpenAI Test Successful!",
          description: `API responded: ${data.message}`,
        });
      } else {
        toast({
          title: "Unexpected Response",
          description: "API test completed but response format was unexpected",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateExercise = async () => {
    setIsGenerating(true);
    setGeneratedMusicXML('');

    try {
      console.log('Generating sight-reading exercise...');
      console.log('Parameters:', {
        difficulty,
        keySignature,
        timeSignature,
        measures: measures[0],
        noteRange
      });
      
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: {
          difficulty,
          keySignature,
          timeSignature,
          measures: measures[0],
          noteRange
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from function');
      }

      const { musicXML } = data;
      
      if (!musicXML) {
        throw new Error('No MusicXML content in response');
      }
      
      // Validate the generated MusicXML
      if (!validateMusicXML(musicXML)) {
        console.error('Invalid MusicXML generated:', musicXML?.substring(0, 200));
        throw new Error('Generated MusicXML is invalid. Please try again.');
      }

      console.log('Valid MusicXML generated, length:', musicXML.length);
      setGeneratedMusicXML(musicXML);
      
      toast({
        title: "Exercise Generated",
        description: `Created ${measures[0]}-measure sight-reading exercise in ${keySignature}`
      });

    } catch (error) {
      console.error('Error generating exercise:', error);
      
      // More specific error messages
      let errorMessage = "Failed to generate sight-reading exercise";
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network error: Unable to connect to the generation service. Please check your internet connection and try again.";
      } else if (error.message?.includes('500')) {
        errorMessage = "Server error: The music generation service is currently unavailable. Please try again in a moment.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sight Reading Generator</h1>
            <p className="text-muted-foreground">Generate AI-powered sight-reading exercises with professional notation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Exercise Parameters</CardTitle>
                <CardDescription>Customize your sight-reading exercise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key">Key Signature</Label>
                  <Select value={keySignature} onValueChange={setKeySignature}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C major">C Major</SelectItem>
                      <SelectItem value="G major">G Major</SelectItem>
                      <SelectItem value="D major">D Major</SelectItem>
                      <SelectItem value="A major">A Major</SelectItem>
                      <SelectItem value="F major">F Major</SelectItem>
                      <SelectItem value="Bb major">B♭ Major</SelectItem>
                      <SelectItem value="Eb major">E♭ Major</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time Signature</Label>
                  <Select value={timeSignature} onValueChange={setTimeSignature}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="measures">Number of Measures: {measures[0]}</Label>
                  <Slider
                    value={measures}
                    onValueChange={setMeasures}
                    min={4}
                    max={16}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="range">Note Range</Label>
                  <Select value={noteRange} onValueChange={setNoteRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C4-C5">C4 - C5 (Soprano)</SelectItem>
                      <SelectItem value="G3-G4">G3 - G4 (Alto)</SelectItem>
                      <SelectItem value="C3-C4">C3 - C4 (Tenor)</SelectItem>
                      <SelectItem value="E2-E3">E2 - E3 (Bass)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateExercise}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? "Generating..." : "Generate Exercise"}
                </Button>
                
                <Button
                  onClick={testOpenAI}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Test OpenAI Connection
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sheet Music Display */}
          <div className="lg:col-span-2">
            {generatedMusicXML ? (
              <OSMDViewer 
                musicXML={generatedMusicXML}
                title={`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Exercise - ${keySignature}`}
              />
            ) : (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center text-muted-foreground">
                    <Music className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium mb-2">No Exercise Generated</h3>
                    <p>Configure your parameters and click "Generate Exercise" to create a sight-reading exercise.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default SightReadingGeneratorPage;