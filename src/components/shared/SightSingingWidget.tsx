import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Music, Play, RefreshCw, Settings, Download } from 'lucide-react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { useSightSingingAI, SightSingingParams, SightSingingResult } from '@/hooks/useSightSingingAI';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';

interface SightSingingWidgetProps {
  context?: 'music-theory' | 'audition' | 'practice' | 'assignment';
  title?: string;
  defaultParams?: Partial<SightSingingParams>;
  showAdvancedControls?: boolean;
  onExerciseGenerated?: (result: SightSingingResult) => void;
  onStartPractice?: (result: SightSingingResult) => void;
  className?: string;
}

export const SightSingingWidget: React.FC<SightSingingWidgetProps> = ({
  context = 'practice',
  title,
  defaultParams = {},
  showAdvancedControls = false,
  onExerciseGenerated,
  onStartPractice,
  className = ''
}) => {
  const { generate, isGenerating, error } = useSightSingingAI();
  const [currentExercise, setCurrentExercise] = useState<SightSingingResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Parameters state
  const [key, setKey] = useState(defaultParams.key?.tonic || 'C');
  const [mode, setMode] = useState(defaultParams.key?.mode || 'major');
  const [timeSignature, setTimeSignature] = useState(defaultParams.timeSignature || { num: 4, den: 4 });
  const [measures, setMeasures] = useState(defaultParams.measures || 8);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    defaultParams.difficulty || 'beginner'
  );

  // Sheet music display
  const sheetMusicRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  // Initialize OSMD
  useEffect(() => {
    if (sheetMusicRef.current && !osmdRef.current) {
      try {
        sheetMusicRef.current.innerHTML = '';
        osmdRef.current = new OpenSheetMusicDisplay(sheetMusicRef.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: false,
          drawComposer: false,
          drawCredits: false,
          drawLyrics: false,
          drawPartNames: false,
          spacingFactorSoftmax: 5,
          spacingBetweenTextLines: 0.5,
          newSystemFromXML: false,
          newPageFromXML: false,
          autoBeam: true,
        });
      } catch (error) {
        console.error('Error initializing OSMD:', error);
      }
    }
  }, []);

  // Render sheet music when exercise changes
  useEffect(() => {
    if (currentExercise && osmdRef.current && sheetMusicRef.current) {
      try {
        console.log('Attempting to render sheet music:', currentExercise.metadata);
        sheetMusicRef.current.innerHTML = ''; // Clear previous content
        osmdRef.current.load(currentExercise.musicXML).then(() => {
          console.log('MusicXML loaded successfully, rendering...');
          osmdRef.current?.render();
          console.log('Sheet music rendered successfully');
        }).catch((error) => {
          console.error('Error loading MusicXML:', error);
          // Show fallback content
          if (sheetMusicRef.current) {
            sheetMusicRef.current.innerHTML = `
              <div class="flex items-center justify-center h-48 text-muted-foreground">
                <div class="text-center">
                  <Music class="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Unable to display sheet music</p>
                  <p class="text-sm">Generated exercise is ready for practice</p>
                </div>
              </div>
            `;
          }
        });
      } catch (error) {
        console.error('Error in sheet music rendering:', error);
        // Show error message in the display area
        if (sheetMusicRef.current) {
          sheetMusicRef.current.innerHTML = `
            <div class="flex items-center justify-center h-48 text-muted-foreground">
              <div class="text-center">
                <p>Sheet music display error</p>
                <p class="text-sm">Exercise generated but cannot be displayed</p>
              </div>
            </div>
          `;
        }
      }
    }
  }, [currentExercise]);

  const handleGenerate = async () => {
    const params: SightSingingParams = {
      key: { tonic: key, mode },
      timeSignature,
      measures,
      difficulty,
      context,
      ...defaultParams // Allow props to override
    };

    const result = await generate(params);
    if (result) {
      setCurrentExercise(result);
      onExerciseGenerated?.(result);
    }
  };

  const handleStartPractice = () => {
    if (currentExercise && onStartPractice) {
      onStartPractice(currentExercise);
    }
  };

  const getContextTitle = () => {
    if (title) return title;
    switch (context) {
      case 'music-theory':
        return 'Music Theory Sight Singing';
      case 'audition':
        return 'Audition Sight Reading';
      case 'assignment':
        return 'Sight Reading Assignment';
      default:
        return 'Sight Singing Practice';
    }
  };

  const getContextDescription = () => {
    switch (context) {
      case 'music-theory':
        return 'Practice sight singing to reinforce music theory concepts';
      case 'audition':
        return 'Prepare with challenging sight reading exercises';
      case 'assignment':
        return 'Complete your sight reading assignment';
      default:
        return 'Generate and practice sight singing exercises';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              {getContextTitle()}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {getContextDescription()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentExercise && (
              <Badge variant="secondary">
                {currentExercise.metadata.key} • {currentExercise.metadata.timeSignature} • {currentExercise.metadata.measures} bars
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="key">Key:</Label>
            <Select value={key} onValueChange={setKey}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'].map(k => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="difficulty">Difficulty:</Label>
            <Select value={difficulty} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setDifficulty(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label>Measures:</Label>
            <Slider
              value={[measures]}
              onValueChange={(value) => setMeasures(value[0])}
              max={16}
              min={4}
              step={4}
              className="w-20"
            />
            <span className="text-sm font-medium w-6">{measures}</span>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvancedControls && (
          <Collapsible open={showSettings} onOpenChange={setShowSettings}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Advanced Settings
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mode:</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Time Signature:</Label>
                  <Select 
                    value={`${timeSignature.num}/${timeSignature.den}`} 
                    onValueChange={(value) => {
                      const [num, den] = value.split('/').map(Number);
                      setTimeSignature({ num, den });
                    }}
                  >
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Music className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Exercise'}
          </Button>

          {currentExercise && onStartPractice && (
            <Button onClick={handleStartPractice} variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Practice
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Sheet Music Display - Optimized for Mobile */}
        {currentExercise && (
          <div className="bg-background relative -mx-2 sm:mx-0 p-1 sm:p-4 border-t border-border sm:border sm:rounded-lg">
            <div className="flex items-center justify-between mb-1 sm:mb-2 px-2 sm:px-0">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Generated Exercise</h3>
              <Badge variant="outline" className="text-xs">
                {currentExercise.metadata.difficulty} • {currentExercise.metadata.context}
              </Badge>
            </div>
            <ScoreDisplay musicXML={currentExercise.musicXML} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};