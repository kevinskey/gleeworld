import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Music, Play, RefreshCw } from 'lucide-react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { useToast } from '@/hooks/use-toast';

interface Note {
  note: string;
  time: number;
  duration?: number;
}

interface GeneratorParams {
  key: string;
  range: string;
  difficulty: number;
}

export const SightReadingGenerator = ({ onStartSightReading }: { onStartSightReading?: (melody: Note[]) => void }) => {
  const [params, setParams] = useState<GeneratorParams>({
    key: 'C',
    range: 'C4-G4',
    difficulty: 1
  });
  const [generatedMelody, setGeneratedMelody] = useState<Note[]>([]);
  const [musicXML, setMusicXML] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const sheetMusicRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const { toast } = useToast();

  const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
  const ranges = [
    'C4-G4', 'C4-C5', 'G3-G4', 'F4-F5', 'E4-E5'
  ];

  // Initialize OSMD
  useEffect(() => {
    console.log('OSMD useEffect triggered, sheetMusicRef.current:', !!sheetMusicRef.current);
    console.log('osmdRef.current exists:', !!osmdRef.current);
    
    if (sheetMusicRef.current && !osmdRef.current) {
      try {
        console.log('Attempting to create OSMD instance...');
        // Clear any existing content
        sheetMusicRef.current.innerHTML = '';
        
        osmdRef.current = new OpenSheetMusicDisplay(sheetMusicRef.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: false,
          drawComposer: false,
          drawCredits: false,
          drawLyrics: false,
          drawPartNames: false,
          coloringMode: 0,
          followCursor: false,
          cursorsOptions: [],
          pageFormat: 'A4_P',
          pageBackgroundColor: '#FFFFFF',
          renderSingleHorizontalStaffline: false,
          defaultFontFamily: 'Times New Roman',
          // Ensure proper rendering
          drawingParameters: 'default'
        });
        console.log('OSMD initialized successfully:', !!osmdRef.current);
      } catch (error) {
        console.error('Error initializing OSMD:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize music display: " + error.message,
          variant: "destructive"
        });
      }
    }
  }, []);

  const getNoteSequence = (range: string, key: string): string[] => {
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const keyIndex = notes.indexOf(key);
    const rotatedNotes = [...notes.slice(keyIndex), ...notes.slice(0, keyIndex)];
    
    const [startNote, endNote] = range.split('-');
    const startOctave = parseInt(startNote.slice(-1));
    const endOctave = parseInt(endNote.slice(-1));
    
    const sequence = [];
    for (let octave = startOctave; octave <= endOctave; octave++) {
      rotatedNotes.forEach(note => {
        const noteWithOctave = `${note}${octave}`;
        if (noteWithOctave >= startNote && noteWithOctave <= endNote) {
          sequence.push(noteWithOctave);
        }
      });
    }
    
    return sequence;
  };

  const generateMelody = () => {
    setIsGenerating(true);
    
    const noteSequence = getNoteSequence(params.range, params.key);
    const melody: Note[] = [];
    const barsCount = 8;
    const notesPerBar = 4; // 4/4 time
    const beatDuration = 0.5; // Half second per beat
    
    for (let bar = 0; bar < barsCount; bar++) {
      for (let beat = 0; beat < notesPerBar; beat++) {
        const time = (bar * notesPerBar + beat) * beatDuration;
        
        // Generate note based on difficulty
        let noteIndex;
        if (params.difficulty <= 2) {
          // Easier: mostly stepwise motion
          const lastNoteIndex = melody.length > 0 
            ? noteSequence.indexOf(melody[melody.length - 1].note)
            : Math.floor(noteSequence.length / 2);
          
          const step = Math.random() < 0.7 
            ? (Math.random() < 0.5 ? -1 : 1) // Step up or down
            : (Math.random() < 0.5 ? -2 : 2); // Small leap
          
          noteIndex = Math.max(0, Math.min(noteSequence.length - 1, lastNoteIndex + step));
        } else {
          // Harder: more random intervals
          noteIndex = Math.floor(Math.random() * noteSequence.length);
        }
        
        melody.push({
          note: noteSequence[noteIndex],
          time,
          duration: beatDuration
        });
      }
    }
    
    setGeneratedMelody(melody);
    console.log('Generated melody:', melody);
    generateMusicXML(melody);
    setIsGenerating(false);
    toast({
      title: "Melody Generated",
      description: `Generated ${melody.length} notes in ${params.key} major`
    });
  };

  const generateMusicXML = (melody: Note[]) => {
    // Generate proper MusicXML for OSMD
    const keySignatures: { [key: string]: number } = {
      'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6,
      'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5
    };
    
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Sight Reading Exercise</work-title>
  </work>
  <identification>
    <creator type="composer">Spelman Glee Club Sight Reading Generator</creator>
    <encoding>
      <software>GleeWorld.org</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Voice</instrument-name>
      </score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    ${generateBars(melody, keySignatures[params.key] || 0)}
  </part>
</score-partwise>`;
    
    console.log('Generated MusicXML:', xml.substring(0, 200) + '...');
    setMusicXML(xml);
    displayMusic(xml);
  };

  const generateBars = (melody: Note[], fifths: number) => {
    const barsCount = 8;
    const notesPerBar = 4;
    let bars = '';
    
    for (let bar = 0; bar < barsCount; bar++) {
      const barNotes = melody.slice(bar * notesPerBar, (bar + 1) * notesPerBar);
      bars += `
    <measure number="${bar + 1}">
      ${bar === 0 ? `
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>${fifths}</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>` : ''}
      ${barNotes.map(note => {
        const [noteName, octave] = [note.note.slice(0, -1), note.note.slice(-1)];
        const step = noteName.charAt(0);
        const alter = noteName.includes('#') ? 1 : noteName.includes('b') ? -1 : 0;
        
        return `
      <note>
        <pitch>
          <step>${step}</step>
          ${alter !== 0 ? `<alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>`;
      }).join('')}
    </measure>`;
    }
    
    return bars;
  };

  const displayMusic = async (xml: string) => {
    console.log('displayMusic called');
    console.log('osmdRef.current exists:', !!osmdRef.current);
    console.log('sheetMusicRef.current exists:', !!sheetMusicRef.current);
    console.log('XML length:', xml.length);
    
    if (osmdRef.current && sheetMusicRef.current) {
      try {
        console.log('Loading MusicXML into OSMD...');
        
        // Clear the container first
        sheetMusicRef.current.innerHTML = '';
        
        // Load and render the music
        await osmdRef.current.load(xml);
        console.log('MusicXML loaded successfully, now rendering...');
        
        await osmdRef.current.render();
        console.log('Music rendered successfully');
        
        // Check if content was actually rendered
        const svgElements = sheetMusicRef.current.querySelectorAll('svg');
        console.log('SVG elements found after render:', svgElements.length);
        
        if (svgElements.length === 0) {
          console.error('No SVG elements found after render');
          // Fallback: show a message instead of code
          sheetMusicRef.current.innerHTML = `
            <div class="flex items-center justify-center h-64 text-muted-foreground">
              <div class="text-center">
                <p>Music notation failed to render</p>
                <p class="text-sm mt-2">OSMD rendering issue detected</p>
              </div>
            </div>
          `;
        }
        
      } catch (error) {
        console.error('Error displaying music:', error);
        
        // Clear any partial content and show error
        sheetMusicRef.current.innerHTML = `
          <div class="flex items-center justify-center h-64 text-destructive">
            <div class="text-center">
              <p>Failed to render sheet music</p>
              <p class="text-sm mt-2">${error.message}</p>
            </div>
          </div>
        `;
        
        toast({
          title: "Display Error",
          description: "Failed to display the generated music notation: " + error.message,
          variant: "destructive"
        });
      }
    } else {
      console.error('Missing references - osmdRef:', !!osmdRef.current, 'sheetMusicRef:', !!sheetMusicRef.current);
    }
  };

  const downloadMusicXML = () => {
    if (!musicXML) return;
    
    const blob = new Blob([musicXML], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sight-reading-${params.key}-${params.difficulty}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!sheetMusicRef.current) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(sheetMusicRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`sight-reading-${params.key}-${params.difficulty}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: "Sheet music saved as PDF"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  // Add function to load custom melody
  const loadCustomMelody = () => {
    const customMelody: Note[] = [
      { "note": "D4", "time": 0, "duration": 0.5 },
      { "note": "F4", "time": 0.5, "duration": 0.5 },
      { "note": "G4", "time": 1, "duration": 0.5 },
      { "note": "E4", "time": 1.5, "duration": 0.5 },
      { "note": "D4", "time": 2, "duration": 0.5 },
      { "note": "E4", "time": 2.5, "duration": 0.5 },
      { "note": "F4", "time": 3, "duration": 0.5 },
      { "note": "E4", "time": 3.5, "duration": 0.5 },
      { "note": "G4", "time": 4, "duration": 0.5 },
      { "note": "F4", "time": 4.5, "duration": 0.5 },
      { "note": "D4", "time": 5, "duration": 0.5 },
      { "note": "C4", "time": 5.5, "duration": 0.5 },
      { "note": "C4", "time": 6, "duration": 0.5 },
      { "note": "C4", "time": 6.5, "duration": 0.5 },
      { "note": "D4", "time": 7, "duration": 0.5 },
      { "note": "E4", "time": 7.5, "duration": 0.5 },
      { "note": "F4", "time": 8, "duration": 0.5 },
      { "note": "D4", "time": 8.5, "duration": 0.5 },
      { "note": "C4", "time": 9, "duration": 0.5 },
      { "note": "E4", "time": 9.5, "duration": 0.5 },
      { "note": "D4", "time": 10, "duration": 0.5 },
      { "note": "C4", "time": 10.5, "duration": 0.5 },
      { "note": "C4", "time": 11, "duration": 0.5 },
      { "note": "C4", "time": 11.5, "duration": 0.5 },
      { "note": "C4", "time": 12, "duration": 0.5 },
      { "note": "C4", "time": 12.5, "duration": 0.5 },
      { "note": "C4", "time": 13, "duration": 0.5 },
      { "note": "E4", "time": 13.5, "duration": 0.5 },
      { "note": "D4", "time": 14, "duration": 0.5 },
      { "note": "C4", "time": 14.5, "duration": 0.5 },
      { "note": "C4", "time": 15, "duration": 0.5 },
      { "note": "C4", "time": 15.5, "duration": 0.5 }
    ];
    
    console.log('Loading custom melody with', customMelody.length, 'notes');
    setGeneratedMelody(customMelody);
    generateMusicXML(customMelody);
    
    toast({
      title: "Custom Melody Loaded",
      description: `Loaded ${customMelody.length} notes from reference melody`
    });
  };

  const handleStartSightReading = () => {
    if (generatedMelody.length === 0) {
      toast({
        title: "No Melody",
        description: "Please generate a melody first",
        variant: "destructive"
      });
      return;
    }
    
    if (onStartSightReading) {
      onStartSightReading(generatedMelody);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Sight Reading Generator (OSMD)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Select
                value={params.key}
                onValueChange={(value) => setParams({ ...params, key: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key} Major
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="range">Range</Label>
              <Select
                value={params.range}
                onValueChange={(value) => setParams({ ...params, range: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {ranges.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={params.difficulty.toString()}
                onValueChange={(value) => setParams({ ...params, difficulty: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateMelody}
              disabled={isGenerating}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? "Generating..." : "Generate Random Melody"}
            </Button>
            
            <Button
              onClick={loadCustomMelody}
              disabled={isGenerating}
              variant="outline"
              className="flex-1"
            >
              <Music className="h-4 w-4 mr-2" />
              Load Reference Melody
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedMelody.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Generated Sheet Music (OpenSheetMusicDisplay)</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={sheetMusicRef} 
                className="bg-white p-4 rounded-md border min-h-[400px] overflow-auto"
                style={{ 
                  minHeight: '400px',
                  maxWidth: '100%'
                }}
              />
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={downloadMusicXML}>
                  <Download className="h-4 w-4 mr-2" />
                  Download MusicXML
                </Button>
                <Button variant="outline" onClick={downloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {onStartSightReading && (
                  <Button onClick={handleStartSightReading} className="ml-auto">
                    <Play className="h-4 w-4 mr-2" />
                    Start Sight Reading
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Melody Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-48">
                {JSON.stringify(generatedMelody, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};