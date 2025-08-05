import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Music, Play, RefreshCw } from 'lucide-react';
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
  
  const { toast } = useToast();

  const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
  const ranges = [
    'C4-G4', 'C4-C5', 'G3-G4', 'F4-F5', 'E4-E5'
  ];

  // Simple SVG music notation renderer
  const renderMusicNotation = (melody: Note[]) => {
    if (melody.length === 0) return null;
    
    const svgWidth = 800;
    const svgHeight = 200;
    const noteSpacing = 80;
    const startX = 60;
    const startY = 100;
    
    // Staff lines
    const staffLines = [];
    for (let i = 0; i < 5; i++) {
      staffLines.push(
        <line
          key={`staff-${i}`}
          x1={20}
          y1={startY + i * 10}
          x2={svgWidth - 20}
          y2={startY + i * 10}
          stroke="#000"
          strokeWidth={1}
        />
      );
    }
    
    // Clef (simplified treble clef symbol)
    const trebleClef = (
      <text
        key="clef"
        x={30}
        y={startY + 20}
        fontSize="24"
        fontFamily="serif"
        fill="#000"
      >
        𝄞
      </text>
    );
    
    // Note positions mapping
    const notePositions: { [key: string]: number } = {
      'G5': startY - 20, 'F5': startY - 15, 'E5': startY - 10, 'D5': startY - 5, 'C5': startY,
      'B4': startY + 5, 'A4': startY + 10, 'G4': startY + 15, 'F4': startY + 20, 'E4': startY + 25,
      'D4': startY + 30, 'C4': startY + 35, 'B3': startY + 40, 'A3': startY + 45, 'G3': startY + 50
    };
    
    // Render notes
    const notes = melody.slice(0, 16).map((note, index) => {
      const x = startX + (index % 8) * noteSpacing;
      const y = notePositions[note.note] || startY + 15;
      const bar = Math.floor(index / 4);
      const barX = x + (bar * 20); // Add spacing between bars
      
      return (
        <g key={`note-${index}`}>
          {/* Note head */}
          <ellipse
            cx={barX}
            cy={y}
            rx={6}
            ry={4}
            fill="#000"
            transform={`rotate(-20 ${barX} ${y})`}
          />
          {/* Stem */}
          <line
            x1={barX + 5}
            y1={y}
            x2={barX + 5}
            y2={y - 25}
            stroke="#000"
            strokeWidth={1.5}
          />
          {/* Ledger lines for notes outside staff */}
          {(y < startY - 10 || y > startY + 50) && (
            <line
              x1={barX - 10}
              y1={y}
              x2={barX + 10}
              y2={y}
              stroke="#000"
              strokeWidth={1}
            />
          )}
        </g>
      );
    });
    
    return (
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {staffLines}
        {trebleClef}
        {notes}
      </svg>
    );
  };

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
    generateMusicXML(melody);
    setIsGenerating(false);
    toast({
      title: "Melody Generated",
      description: `Generated ${melody.length} notes in ${params.key} major`
    });
  };

  const generateMusicXML = (melody: Note[]) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Sight Reading Exercise</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    ${generateBars(melody)}
  </part>
</score-partwise>`;
    
    setMusicXML(xml);
  };

  const generateBars = (melody: Note[]) => {
    const barsCount = 8;
    const notesPerBar = 4;
    let bars = '';
    
    for (let bar = 0; bar < barsCount; bar++) {
      const barNotes = melody.slice(bar * notesPerBar, (bar + 1) * notesPerBar);
      bars += `
    <measure number="${bar + 1}">
      ${bar === 0 ? `
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
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
      ${barNotes.map(note => `
      <note>
        <pitch>
          <step>${note.note.charAt(0)}</step>
          <octave>${note.note.slice(-1)}</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>`).join('')}
    </measure>`;
    }
    
    return bars;
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
    const notation = document.querySelector('#music-notation-svg');
    if (!notation) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(notation as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
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
            Sight Reading Generator
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

          <Button
            onClick={generateMelody}
            disabled={isGenerating}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? "Generating..." : "Generate Melody"}
          </Button>
        </CardContent>
      </Card>

      {generatedMelody.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Generated Sheet Music</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                id="music-notation-svg"
                className="bg-white p-4 rounded-md border flex justify-center"
              >
                {renderMusicNotation(generatedMelody)}
              </div>
              
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