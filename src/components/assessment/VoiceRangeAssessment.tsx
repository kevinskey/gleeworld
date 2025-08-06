import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Music, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRangeAssessmentProps {
  userId?: string;
}

interface AssessmentResult {
  score: number;
  overall_percentage: number;
  note_by_note_results: Array<{
    note_index: number;
    expected_note: string;
    expected_frequency: number;
    detected_frequency: number;
    detected_note: string;
    is_accurate: boolean;
    frequency_difference: number;
    confidence: number;
  }>;
  detected_pitches_hz: number[];
  reference_melody: {
    notes: string[];
    frequencies_hz: number[];
    voice_range: string;
  };
  user_id: string;
  timestamp: string;
}

const VOICE_RANGES = {
  soprano: {
    label: 'Soprano',
    description: 'Higher voice range (C4-G4)',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4'],
    color: 'bg-pink-100 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700'
  },
  alto: {
    label: 'Alto', 
    description: 'Lower voice range (G3-D4)',
    notes: ['G3', 'A3', 'B3', 'C4', 'D4'],
    color: 'bg-purple-100 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
  }
};

export const VoiceRangeAssessment: React.FC<VoiceRangeAssessmentProps> = ({ 
  userId = "00000000-0000-0000-0000-000000000000" 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceRange, setVoiceRange] = useState<string>('soprano');
  const [isAssessing, setIsAssessing] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/webm'];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|m4a|webm)$/i)) {
        toast.error('Please select a valid audio file (.wav, .mp3, .m4a, or .webm)');
        return;
      }
      
      setSelectedFile(file);
      setResult(null); // Clear previous results
    }
  };

  const assessSinging = async () => {
    if (!selectedFile) {
      toast.error('Please select an audio file first');
      return;
    }

    setIsAssessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_id', userId);
      formData.append('voice_range', voiceRange);

      const response = await fetch('http://localhost:8000/grade_singing', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const assessmentResult: AssessmentResult = await response.json();
      setResult(assessmentResult);
      
      toast.success(`Assessment complete! Score: ${assessmentResult.score}%`);
      
    } catch (error) {
      console.error('Assessment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assess singing. Please try again.');
    } finally {
      setIsAssessing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const selectedRange = VOICE_RANGES[voiceRange as keyof typeof VOICE_RANGES];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Music className="h-6 w-6" />
            Voice Range Singing Assessment
          </CardTitle>
          <p className="text-muted-foreground">
            Upload your singing to get AI-powered pitch analysis for your voice range
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Voice Range Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Your Voice Range:</label>
            <Select value={voiceRange} onValueChange={setVoiceRange}>
              <SelectTrigger className="w-full bg-background/60 backdrop-blur-sm border-2 z-50">
                <SelectValue placeholder="Choose voice range" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-sm border-2 z-50">
                {Object.entries(VOICE_RANGES).map(([range, info]) => (
                  <SelectItem key={range} value={range} className="focus:bg-primary/10">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{info.label}</span>
                      <span className="text-xs text-muted-foreground">{info.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Range Preview */}
            <div className={`p-3 rounded-lg border ${selectedRange.color}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">{selectedRange.label} Range</span>
                <div className="flex gap-1">
                  {selectedRange.notes.map((note, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 text-xs bg-background/60 rounded border"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Upload Audio Recording:</label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".wav,.mp3,.m4a,.webm,audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="audio-upload"
              />
              <label 
                htmlFor="audio-upload" 
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  Supports .wav, .mp3, .m4a, .webm files
                </span>
              </label>
            </div>
            
            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Mic className="h-4 w-4" />
                <span className="text-sm">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>

          {/* Assessment Button */}
          <Button 
            onClick={assessSinging}
            disabled={!selectedFile || isAssessing}
            className="w-full"
            size="lg"
          >
            {isAssessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Analyzing Pitch...
              </>
            ) : (
              <>
                <Music className="h-4 w-4 mr-2" />
                Assess My Singing
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Assessment Results</span>
              <span className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}%
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Voice Range: {result.reference_melody.voice_range.charAt(0).toUpperCase() + 
              result.reference_melody.voice_range.slice(1)}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-lg font-medium">Overall Accuracy</div>
              <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                {result.overall_percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {result.note_by_note_results.filter(r => r.is_accurate).length} out of{' '}
                {result.note_by_note_results.length} notes accurate
              </div>
            </div>

            {/* Note-by-Note Results */}
            <div className="space-y-3">
              <h3 className="font-medium">Note-by-Note Analysis:</h3>
              <div className="space-y-2">
                {result.note_by_note_results.map((note, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      note.is_accurate 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Note {index + 1}</span>
                        <span className="text-sm">
                          Expected: <strong>{note.expected_note}</strong>
                        </span>
                        <span className="text-sm">
                          Detected: <strong>{note.detected_note}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          Confidence: {(note.confidence * 100).toFixed(0)}%
                        </div>
                        <div 
                          className={`w-3 h-3 rounded-full ${getConfidenceColor(note.confidence)}`}
                          title={`${(note.confidence * 100).toFixed(0)}% confidence`}
                        />
                      </div>
                    </div>
                    
                    {note.detected_frequency > 0 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Expected: {note.expected_frequency.toFixed(1)} Hz | 
                        Detected: {note.detected_frequency.toFixed(1)} Hz | 
                        Difference: {Math.abs(note.frequency_difference).toFixed(1)} Hz
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reference Melody */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Reference Melody ({result.reference_melody.voice_range}):</h3>
              <div className="flex gap-2 flex-wrap">
                {result.reference_melody.notes.map((note, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-primary/10 border border-primary/20 rounded text-sm"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};