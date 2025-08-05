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

  // Professional SVG music notation renderer
  const renderMusicNotation = (melody: Note[]) => {
    if (melody.length === 0) return null;
    
    const svgWidth = 900;
    const svgHeight = 280;
    const staffSpacing = 12;
    const noteSpacing = 90;
    const startX = 100;
    const staffStartY = 80;
    const barLineSpacing = 360; // Space for 4 measures per line
    
    const elements = [];
    
    // Create two staff systems (8 bars total, 4 per line)
    for (let system = 0; system < 2; system++) {
      const staffY = staffStartY + (system * 120);
      
      // Staff lines for this system
      for (let i = 0; i < 5; i++) {
        elements.push(
          <line
            key={`staff-${system}-${i}`}
            x1={40}
            y1={staffY + i * staffSpacing}
            x2={svgWidth - 40}
            y2={staffY + i * staffSpacing}
            stroke="#000"
            strokeWidth={1.2}
          />
        );
      }
      
      // Treble clef (more professional styling)
      elements.push(
        <g key={`clef-${system}`}>
          <path
            d={`M ${60} ${staffY + 48} 
                Q ${65} ${staffY + 35} ${70} ${staffY + 25}
                Q ${75} ${staffY + 15} ${65} ${staffY + 10}
                Q ${55} ${staffY + 15} ${60} ${staffY + 25}
                Q ${65} ${staffY + 35} ${60} ${staffY + 45}
                L ${60} ${staffY + 55}
                Q ${58} ${staffY + 60} ${62} ${staffY + 62}
                Q ${68} ${staffY + 60} ${66} ${staffY + 55}
                L ${66} ${staffY + 20}
                Q ${70} ${staffY + 8} ${75} ${staffY + 12}
                Q ${80} ${staffY + 18} ${75} ${staffY + 30}
                Q ${70} ${staffY + 42} ${75} ${staffY + 50}
                Q ${80} ${staffY + 42} ${75} ${staffY + 35}
                Q ${70} ${staffY + 25} ${75} ${staffY + 15}
                Q ${82} ${staffY + 8} ${78} ${staffY - 2}
                Q ${70} ${staffY - 8} ${62} ${staffY + 5}
                Q ${58} ${staffY + 15} ${62} ${staffY + 25}
                L ${62} ${staffY + 48} Z`}
            fill="#000"
            strokeWidth={0.5}
            stroke="#000"
          />
        </g>
      );
      
      // Time signature (4/4)
      elements.push(
        <g key={`time-${system}`}>
          <text
            x={85}
            y={staffY + 20}
            fontSize="18"
            fontWeight="bold"
            fontFamily="Times, serif"
            fill="#000"
            textAnchor="middle"
          >
            4
          </text>
          <text
            x={85}
            y={staffY + 38}
            fontSize="18"
            fontWeight="bold"
            fontFamily="Times, serif"
            fill="#000"
            textAnchor="middle"
          >
            4
          </text>
        </g>
      );
      
      // Bar lines for this system
      for (let bar = 0; bar <= 4; bar++) {
        const barX = startX + (bar * barLineSpacing / 4);
        elements.push(
          <line
            key={`bar-${system}-${bar}`}
            x1={barX}
            y1={staffY}
            x2={barX}
            y2={staffY + (4 * staffSpacing)}
            stroke="#000"
            strokeWidth={bar === 0 || bar === 4 ? 2 : 1}
          />
        );
      }
    }
    
    // Enhanced note positions with more precision
    const notePositions: { [key: string]: number } = {
      'B5': staffStartY - 24, 'A5': staffStartY - 18, 'G5': staffStartY - 12, 'F5': staffStartY - 6, 'E5': staffStartY,
      'D5': staffStartY + 6, 'C5': staffStartY + 12, 'B4': staffStartY + 18, 'A4': staffStartY + 24, 'G4': staffStartY + 30,
      'F4': staffStartY + 36, 'E4': staffStartY + 42, 'D4': staffStartY + 48, 'C4': staffStartY + 54, 'B3': staffStartY + 60,
      'A3': staffStartY + 66, 'G3': staffStartY + 72
    };
    
    // Render notes with professional styling
    melody.slice(0, 32).forEach((note, index) => {
      const system = Math.floor(index / 16);
      const systemIndex = index % 16;
      const measure = Math.floor(systemIndex / 4);
      const beat = systemIndex % 4;
      
      const baseY = system === 0 ? staffStartY : staffStartY + 120;
      const noteY = notePositions[note.note] ? 
        notePositions[note.note] + (system * 120) : 
        baseY + 30;
      
      const x = startX + 20 + (measure * (barLineSpacing / 4)) + (beat * 65);
      
      // Note head (professional ellipse)
      elements.push(
        <ellipse
          key={`note-head-${index}`}
          cx={x}
          cy={noteY}
          rx={7}
          ry={5}
          fill="#000"
          transform={`rotate(-15 ${x} ${noteY})`}
        />
      );
      
      // Stem (proper direction based on position)
      const stemDirection = noteY < baseY + 24 ? 1 : -1;
      const stemStartY = noteY + (stemDirection > 0 ? 5 : -5);
      const stemEndY = stemStartY + (stemDirection * 28);
      
      elements.push(
        <line
          key={`stem-${index}`}
          x1={x + (stemDirection > 0 ? 6 : -6)}
          y1={stemStartY}
          x2={x + (stemDirection > 0 ? 6 : -6)}
          y2={stemEndY}
          stroke="#000"
          strokeWidth={1.5}
        />
      );
      
      // Ledger lines for notes outside the staff
      const staffCenter = baseY + 24;
      if (noteY < baseY - 6 || noteY > baseY + 54) {
        // Calculate which ledger lines are needed
        const ledgerLines = [];
        if (noteY < baseY) {
          for (let ledgerY = baseY - 12; ledgerY >= noteY - 6; ledgerY -= 12) {
            ledgerLines.push(ledgerY);
          }
        } else if (noteY > baseY + 48) {
          for (let ledgerY = baseY + 60; ledgerY <= noteY + 6; ledgerY += 12) {
            ledgerLines.push(ledgerY);
          }
        }
        
        ledgerLines.forEach((ledgerY, ledgerIndex) => {
          elements.push(
            <line
              key={`ledger-${index}-${ledgerIndex}`}
              x1={x - 12}
              y1={ledgerY}
              x2={x + 12}
              y2={ledgerY}
              stroke="#000"
              strokeWidth={1.2}
            />
          );
        });
      }
    });
    
    return (
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="music-notation"
      >
        <defs>
          <style>
            {`
              .music-notation {
                font-family: 'Times New Roman', serif;
              }
            `}
          </style>
        </defs>
        {elements}
        
        {/* Add measure numbers */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((measureNum, index) => {
          const system = Math.floor(index / 4);
          const measure = index % 4;
          const x = startX + 20 + (measure * (barLineSpacing / 4));
          const y = staffStartY + (system * 120) - 15;
          
          return (
            <text
              key={`measure-${measureNum}`}
              x={x}
              y={y}
              fontSize="12"
              fontFamily="Arial, sans-serif"
              fill="#666"
              textAnchor="middle"
            >
              {measureNum}
            </text>
          );
        })}
        
        {/* Key signature indicator */}
        <text
          x={svgWidth - 80}
          y={30}
          fontSize="14"
          fontFamily="Arial, sans-serif"
          fill="#666"
          textAnchor="middle"
        >
          {params.key} Major
        </text>
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