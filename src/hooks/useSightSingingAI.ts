import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SightSingingParams {
  key?: {
    tonic: string;
    mode: string;
  };
  timeSignature?: {
    num: number;
    den: number;
  };
  measures?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  range?: {
    low: string;
    high: string;
  };
  intervals?: string[];
  noteValues?: string[];
  includeRests?: boolean;
  cadenceEvery4Bars?: boolean;
  customPrompt?: string;
  context?: 'music-theory' | 'audition' | 'practice' | 'assignment';
}

export interface SightSingingResult {
  musicXML: string;
  notes: Array<{ note: string; time: number; duration?: number }>;
  metadata: {
    key: string;
    timeSignature: string;
    measures: number;
    difficulty: string;
    context?: string;
  };
}

interface UseSightSingingAIReturn {
  generate: (params: SightSingingParams) => Promise<SightSingingResult | null>;
  isGenerating: boolean;
  error: string | null;
}

export const useSightSingingAI = (): UseSightSingingAIReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = async (params: SightSingingParams): Promise<SightSingingResult | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('Generating sight singing exercise with params:', params);

      // Build the generation request with context-aware defaults
      const generationParams = {
        key: params.key || { tonic: 'C', mode: 'major' },
        timeSignature: params.timeSignature || { num: 4, den: 4 },
        measures: params.measures || 8,
        difficulty: params.difficulty || 'beginner',
        range: params.range || { low: 'C4', high: 'G4' },
        intervals: params.intervals || ['unison', 'second', 'third'],
        noteValues: params.noteValues || ['quarter', 'half'],
        includeRests: params.includeRests !== false,
        cadenceEvery4Bars: params.cadenceEvery4Bars !== false,
        context: params.context || 'practice',
        customPrompt: params.customPrompt
      };

      // Add context-specific adjustments
      if (params.context === 'music-theory') {
        // For music theory, focus on specific intervals and patterns
        generationParams.customPrompt = params.customPrompt || 
          "Create a pedagogical sight-singing exercise that reinforces music theory concepts like intervals, scales, and harmonic patterns.";
      } else if (params.context === 'audition') {
        // For auditions, make it more challenging
        generationParams.difficulty = 'intermediate';
        generationParams.customPrompt = params.customPrompt || 
          "Create a challenging but fair sight-singing exercise suitable for audition assessment.";
      }

      const { data, error: functionError } = await supabase.functions.invoke('generate-musicxml', {
        body: generationParams
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate sight singing exercise');
      }

      if (!data || !data.musicxml) {
        throw new Error('Invalid response from generation service');
      }

      // Parse the response and create the result
      const result: SightSingingResult = {
        musicXML: data.musicxml,
        notes: data.notes || [],
        metadata: {
          key: `${generationParams.key.tonic} ${generationParams.key.mode}`,
          timeSignature: `${generationParams.timeSignature.num}/${generationParams.timeSignature.den}`,
          measures: generationParams.measures,
          difficulty: generationParams.difficulty,
          context: generationParams.context
        }
      };

      console.log('Successfully generated sight singing exercise:', result.metadata);

      toast({
        title: "Exercise Generated",
        description: `Created ${result.metadata.measures}-measure exercise in ${result.metadata.key}`,
      });

      return result;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate sight singing exercise';
      setError(errorMessage);
      
      console.error('Sight singing generation error:', err);
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    error
  };
};