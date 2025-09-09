import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  Download, 
  Eye, 
  Music, 
  FileMusic,
  Search,
  Wand2,
  FileUp,
  Files,
  Sparkles
} from 'lucide-react';
import { useSheetMusicLibrary } from '@/hooks/useSheetMusicLibrary';
import { useToast } from '@/hooks/use-toast';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';

interface MusicXMLLibraryProps {
  user: any;
}

export const MusicXMLLibrary: React.FC<MusicXMLLibraryProps> = ({ user }) => {
  const { scores, loading, uploadXML } = useSheetMusicLibrary();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScore, setSelectedScore] = useState<any>(null);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // AI Generation parameters
  const [generationParams, setGenerationParams] = useState({
    title: '',
    composer: '',
    difficulty: 'beginner',
    keySignature: 'C major',
    timeSignature: '4/4',
    tempo: 120,
    numberOfMeasures: 8,
    voiceParts: ['soprano'],
    scalePatterns: [] as string[],
    intervalPatterns: [] as string[],
    rhythmPatterns: [] as string[],
    styleGenre: 'classical',
    includeDynamics: true,
    includeArticulations: true,
    phraseStructure: 'AABA',
    cadenceType: 'authentic',
    textUnderlay: '',
    notes: ''
  });

  const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const keySignatures = [
    'C major', 'G major', 'D major', 'A major', 'E major', 'B major', 'F# major',
    'F major', 'Bb major', 'Eb major', 'Ab major', 'Db major',
    'A minor', 'E minor', 'B minor', 'F# minor', 'C# minor', 'G# minor',
    'D minor', 'G minor', 'C minor', 'F minor', 'Bb minor', 'Eb minor'
  ];
  const timeSignatures = ['4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '2/2', '3/2'];
  const voiceParts = ['soprano', 'alto', 'tenor', 'bass'];
  const scalePatterns = ['major', 'natural minor', 'harmonic minor', 'melodic minor', 'dorian', 'mixolydian', 'pentatonic'];
  const intervalPatterns = ['steps', 'thirds', 'fourths', 'fifths', 'octaves', 'mixed intervals'];
  const rhythmPatterns = ['simple', 'dotted', 'syncopated', 'triplets', 'mixed'];
  const styleGenres = ['classical', 'folk', 'spiritual', 'contemporary', 'baroque', 'romantic'];
  const phraseStructures = ['AABA', 'ABAB', 'ABCA', 'Through-composed', 'Binary', 'Ternary'];
  const cadenceTypes = ['authentic', 'plagal', 'deceptive', 'half', 'mixed'];

  const filteredScores = scores.filter(score => 
    score.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    score.composer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSingleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml') && !file.name.toLowerCase().endsWith('.musicxml')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .xml or .musicxml file.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadXML(file);
      toast({
        title: "Score Uploaded",
        description: "MusicXML file has been uploaded successfully.",
      });
      event.target.value = '';
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file.",
        variant: "destructive",
      });
    }
  };

  const handleBulkFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const xmlFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.musicxml')
    );

    if (xmlFiles.length === 0) {
      toast({
        title: "No Valid Files",
        description: "Please select .xml or .musicxml files.",
        variant: "destructive",
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of xmlFiles) {
      try {
        await uploadXML(file);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast({
      title: "Bulk Upload Complete",
      description: `${successCount} files uploaded successfully. ${errorCount} failed.`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    event.target.value = '';
    setIsUploadDialogOpen(false);
  };

  const handleGenerateScore = async () => {
    try {
      // This would call an edge function to generate MusicXML with AI
      const response = await fetch('/api/generate-musicxml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generationParams)
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      
      toast({
        title: "Score Generated",
        description: "AI-generated MusicXML score has been created successfully.",
      });
      
      setIsGenerationDialogOpen(false);
      // Reset form
      setGenerationParams({
        title: '',
        composer: '',
        difficulty: 'beginner',
        keySignature: 'C major',
        timeSignature: '4/4',
        tempo: 120,
        numberOfMeasures: 8,
        voiceParts: ['soprano'],
        scalePatterns: [],
        intervalPatterns: [],
        rhythmPatterns: [],
        styleGenre: 'classical',
        includeDynamics: true,
        includeArticulations: true,
        phraseStructure: 'AABA',
        cadenceType: 'authentic',
        textUnderlay: '',
        notes: ''
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate score.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Generate
          </TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search library..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">{filteredScores.length} scores</Badge>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredScores.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground">No Scores Found</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm 
                          ? 'Try adjusting your search.'
                          : 'Upload files or generate scores with AI.'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredScores.map((score) => (
                  <Card key={score.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-base">{score.title}</CardTitle>
                          {score.composer && (
                            <CardDescription className="text-sm">
                              by {score.composer}
                              {score.arranger && ` (arr. ${score.arranger})`}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {score.xml_content && <Badge variant="secondary" className="text-xs">AI</Badge>}
                          <Badge variant="outline" className="text-xs">
                            {score.difficulty_level}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{score.key_signature}</span>
                        <span>•</span>
                        <span>{score.time_signature}</span>
                        {score.voice_parts && score.voice_parts.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{score.voice_parts.join(', ')}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedScore(score)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Download functionality
                            if (score.xml_content) {
                              const blob = new Blob([score.xml_content], { type: 'application/xml' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${score.title}.xml`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Single File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Single File Upload
                </CardTitle>
                <CardDescription>
                  Upload one MusicXML file at a time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                  <input
                    type="file"
                    accept=".xml,.musicxml"
                    onChange={handleSingleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileMusic className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to select or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .xml and .musicxml files
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bulk File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Files className="h-5 w-5" />
                  Bulk File Upload
                </CardTitle>
                <CardDescription>
                  Upload multiple MusicXML files at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                  <input
                    type="file"
                    accept=".xml,.musicxml"
                    multiple
                    onChange={handleBulkFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Files className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Select multiple files to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hold Ctrl/Cmd to select multiple files
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Generation Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Score Generation
              </CardTitle>
              <CardDescription>
                Generate custom MusicXML scores with extensive AI parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gen-title">Title *</Label>
                        <Input
                          id="gen-title"
                          value={generationParams.title}
                          onChange={(e) => setGenerationParams({...generationParams, title: e.target.value})}
                          placeholder="Enter score title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gen-composer">Composer</Label>
                        <Input
                          id="gen-composer"
                          value={generationParams.composer}
                          onChange={(e) => setGenerationParams({...generationParams, composer: e.target.value})}
                          placeholder="Enter composer name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Musical Parameters */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Musical Parameters</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select value={generationParams.difficulty} onValueChange={(value) => setGenerationParams({...generationParams, difficulty: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {difficultyLevels.map(level => (
                              <SelectItem key={level} value={level}>
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Key Signature</Label>
                        <Select value={generationParams.keySignature} onValueChange={(value) => setGenerationParams({...generationParams, keySignature: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {keySignatures.map(key => (
                              <SelectItem key={key} value={key}>{key}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Time Signature</Label>
                        <Select value={generationParams.timeSignature} onValueChange={(value) => setGenerationParams({...generationParams, timeSignature: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSignatures.map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Structure Parameters */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Structure Parameters</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Tempo (BPM)</Label>
                        <Input
                          type="number"
                          min="60"
                          max="200"
                          value={generationParams.tempo}
                          onChange={(e) => setGenerationParams({...generationParams, tempo: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Number of Measures</Label>
                        <Input
                          type="number"
                          min="4"
                          max="64"
                          value={generationParams.numberOfMeasures}
                          onChange={(e) => setGenerationParams({...generationParams, numberOfMeasures: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phrase Structure</Label>
                        <Select value={generationParams.phraseStructure} onValueChange={(value) => setGenerationParams({...generationParams, phraseStructure: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {phraseStructures.map(structure => (
                              <SelectItem key={structure} value={structure}>{structure}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Voice Parts */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Voice Parts</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {voiceParts.map(part => (
                        <div key={part} className="flex items-center space-x-2">
                          <Checkbox
                            id={part}
                            checked={generationParams.voiceParts.includes(part)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setGenerationParams({
                                  ...generationParams,
                                  voiceParts: [...generationParams.voiceParts, part]
                                });
                              } else {
                                setGenerationParams({
                                  ...generationParams,
                                  voiceParts: generationParams.voiceParts.filter(p => p !== part)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={part} className="capitalize">{part}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Parameters */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Advanced Parameters</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Style/Genre</Label>
                        <Select value={generationParams.styleGenre} onValueChange={(value) => setGenerationParams({...generationParams, styleGenre: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {styleGenres.map(genre => (
                              <SelectItem key={genre} value={genre}>
                                {genre.charAt(0).toUpperCase() + genre.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cadence Type</Label>
                        <Select value={generationParams.cadenceType} onValueChange={(value) => setGenerationParams({...generationParams, cadenceType: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {cadenceTypes.map(cadence => (
                              <SelectItem key={cadence} value={cadence}>
                                {cadence.charAt(0).toUpperCase() + cadence.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Pattern Selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Musical Patterns</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Scale Patterns</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {scalePatterns.map(pattern => (
                            <div key={pattern} className="flex items-center space-x-2">
                              <Checkbox
                                id={`scale-${pattern}`}
                                checked={generationParams.scalePatterns.includes(pattern)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setGenerationParams({
                                      ...generationParams,
                                      scalePatterns: [...generationParams.scalePatterns, pattern]
                                    });
                                  } else {
                                    setGenerationParams({
                                      ...generationParams,
                                      scalePatterns: generationParams.scalePatterns.filter(p => p !== pattern)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`scale-${pattern}`} className="text-xs capitalize">{pattern}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Interval Patterns</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {intervalPatterns.map(pattern => (
                            <div key={pattern} className="flex items-center space-x-2">
                              <Checkbox
                                id={`interval-${pattern}`}
                                checked={generationParams.intervalPatterns.includes(pattern)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setGenerationParams({
                                      ...generationParams,
                                      intervalPatterns: [...generationParams.intervalPatterns, pattern]
                                    });
                                  } else {
                                    setGenerationParams({
                                      ...generationParams,
                                      intervalPatterns: generationParams.intervalPatterns.filter(p => p !== pattern)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`interval-${pattern}`} className="text-xs capitalize">{pattern}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Rhythm Patterns</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {rhythmPatterns.map(pattern => (
                            <div key={pattern} className="flex items-center space-x-2">
                              <Checkbox
                                id={`rhythm-${pattern}`}
                                checked={generationParams.rhythmPatterns.includes(pattern)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setGenerationParams({
                                      ...generationParams,
                                      rhythmPatterns: [...generationParams.rhythmPatterns, pattern]
                                    });
                                  } else {
                                    setGenerationParams({
                                      ...generationParams,
                                      rhythmPatterns: generationParams.rhythmPatterns.filter(p => p !== pattern)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`rhythm-${pattern}`} className="text-xs capitalize">{pattern}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Additional Options</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dynamics"
                          checked={generationParams.includeDynamics}
                          onCheckedChange={(checked) => setGenerationParams({...generationParams, includeDynamics: checked as boolean})}
                        />
                        <Label htmlFor="dynamics">Include Dynamics</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="articulations"
                          checked={generationParams.includeArticulations}
                          onCheckedChange={(checked) => setGenerationParams({...generationParams, includeArticulations: checked as boolean})}
                        />
                        <Label htmlFor="articulations">Include Articulations</Label>
                      </div>
                    </div>
                  </div>

                  {/* Text and Notes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Text and Notes</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="text-underlay">Text Underlay (optional)</Label>
                        <Textarea
                          id="text-underlay"
                          value={generationParams.textUnderlay}
                          onChange={(e) => setGenerationParams({...generationParams, textUnderlay: e.target.value})}
                          placeholder="Enter lyrics or syllables (e.g., 'do re mi fa sol')"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gen-notes">Additional Notes</Label>
                        <Textarea
                          id="gen-notes"
                          value={generationParams.notes}
                          onChange={(e) => setGenerationParams({...generationParams, notes: e.target.value})}
                          placeholder="Any specific requirements or instructions for the AI"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setGenerationParams({
                    title: '',
                    composer: '',
                    difficulty: 'beginner',
                    keySignature: 'C major',
                    timeSignature: '4/4',
                    tempo: 120,
                    numberOfMeasures: 8,
                    voiceParts: ['soprano'],
                    scalePatterns: [],
                    intervalPatterns: [],
                    rhythmPatterns: [],
                    styleGenre: 'classical',
                    includeDynamics: true,
                    includeArticulations: true,
                    phraseStructure: 'AABA',
                    cadenceType: 'authentic',
                    textUnderlay: '',
                    notes: ''
                  })}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleGenerateScore}
                  disabled={!generationParams.title || generationParams.voiceParts.length === 0}
                  className="min-w-32"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Score
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Score Preview Dialog */}
      {selectedScore && (
        <Dialog open={!!selectedScore} onOpenChange={() => setSelectedScore(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedScore.title}</DialogTitle>
              <DialogDescription>
                {selectedScore.composer && `by ${selectedScore.composer}`}
                {selectedScore.arranger && ` (arr. ${selectedScore.arranger})`}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              {selectedScore.xml_content && (
                <ScoreDisplay 
                  musicXML={selectedScore.xml_content}
                />
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};