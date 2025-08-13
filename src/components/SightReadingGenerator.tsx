import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  timeSignature: string;
  measures: number;
  intervals: string[];
  cadenceEvery4Bars: boolean;
  noteValues: string[];
  restsToInclude: string[];
}

export const SightReadingGenerator = ({ onStartSightReading }: { onStartSightReading?: (melody: Note[]) => void }) => {
  const [params, setParams] = useState<GeneratorParams>({
    key: 'C',
    range: 'C4-G4',
    difficulty: 1,
    timeSignature: '4/4',
    measures: 8,
    intervals: ['unison', 'second', 'third'],
    cadenceEvery4Bars: true,
    noteValues: ['quarter', 'half'],
    restsToInclude: ['quarter']
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
  const timeSignatures = ['4/4', '3/4', '2/4', '6/8', '2/2', '3/8'];
  const measureCounts = [4, 8, 12, 16];
  
  const intervals = [
    { value: 'unison', label: 'Unison (1st)' },
    { value: 'second', label: 'Second (2nd)' },
    { value: 'third', label: 'Third (3rd)' },
    { value: 'fourth', label: 'Fourth (4th)' },
    { value: 'fifth', label: 'Fifth (5th)' },
    { value: 'sixth', label: 'Sixth (6th)' },
    { value: 'seventh', label: 'Seventh (7th)' },
    { value: 'octave', label: 'Octave (8th)' }
  ];
  
  const noteValues = [
    { value: 'whole', label: 'Whole Note', duration: 4 },
    { value: 'half', label: 'Half Note', duration: 2 },
    { value: 'quarter', label: 'Quarter Note', duration: 1 },
    { value: 'eighth', label: 'Eighth Note', duration: 0.5 },
    { value: 'sixteenth', label: 'Sixteenth Note', duration: 0.25 }
  ];
  
  const restTypes = [
    { value: 'whole', label: 'Whole Rest', duration: 4 },
    { value: 'half', label: 'Half Rest', duration: 2 },
    { value: 'quarter', label: 'Quarter Rest', duration: 1 },
    { value: 'eighth', label: 'Eighth Rest', duration: 0.5 }
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
    const barsCount = params.measures;
    
    // FIXED TIMING: 120 BPM (0.5 seconds per quarter note)
    const BPM = 120;
    const quarterNoteDuration = 60 / BPM; // 0.5 seconds per quarter note
    const [beatsPerMeasure, beatType] = params.timeSignature.split('/').map(Number);
    const beatDuration = (4 / beatType) * quarterNoteDuration; // Duration of one beat in the time signature
    
    console.log(`🎵 Generating melody at ${BPM} BPM`);
    console.log(`Quarter note duration: ${quarterNoteDuration}s, Beat duration: ${beatDuration}s`);
    
    // Generate notes with proper rhythm values
    const availableNoteValues = noteValues.filter(nv => params.noteValues.includes(nv.value));
    const availableRests = restTypes.filter(rt => params.restsToInclude.includes(rt.value));
    
    for (let bar = 0; bar < barsCount; bar++) {
      let barTime = 0;
      const barStartTime = bar * beatsPerMeasure * beatDuration;
      
      // Add cadence every 4 bars if enabled
      const shouldAddCadence = params.cadenceEvery4Bars && (bar + 1) % 4 === 0 && bar > 0;
      
      while (barTime < beatsPerMeasure * beatDuration) {
        // Choose note value based on what's available
        const noteValue = availableNoteValues[Math.floor(Math.random() * availableNoteValues.length)];
        const noteDuration = noteValue.duration * quarterNoteDuration; // Duration in seconds
        
        // Check if we should add a rest
        const shouldAddRest = availableRests.length > 0 && Math.random() < 0.2; // 20% chance of rest
        
        if (shouldAddRest) {
          const restType = availableRests[Math.floor(Math.random() * availableRests.length)];
          const restDuration = restType.duration * quarterNoteDuration;
          
          // Only add rest if it fits in the bar
          if (barTime + restDuration <= beatsPerMeasure * beatDuration) {
            melody.push({
              note: 'rest',
              time: barStartTime + barTime,
              duration: restDuration
            });
            barTime += restDuration;
            continue;
          }
        }
        
        // Don't overflow the bar
        const remainingBarTime = (beatsPerMeasure * beatDuration) - barTime;
        const actualDuration = Math.min(noteDuration, remainingBarTime);
        
        if (actualDuration <= 0) break;
        
        // Generate note based on difficulty and intervals
        let noteIndex;
        if (melody.length === 0 || shouldAddCadence) {
          // Start on tonic or cadential note
          noteIndex = Math.floor(noteSequence.length / 2);
        } else {
          const lastNote = melody[melody.length - 1];
          if (lastNote.note === 'rest') {
            // After rest, can jump more freely
            noteIndex = Math.floor(Math.random() * noteSequence.length);
          } else {
            // Follow interval constraints
            const lastNoteIndex = noteSequence.indexOf(lastNote.note);
            const allowedIntervals = params.intervals;
            
            let step = 0;
            if (allowedIntervals.includes('unison')) step = 0;
            else if (allowedIntervals.includes('second')) step = Math.random() < 0.5 ? -1 : 1;
            else if (allowedIntervals.includes('third')) step = Math.random() < 0.5 ? -2 : 2;
            else step = Math.floor(Math.random() * 4) - 2; // Default small range
            
            noteIndex = Math.max(0, Math.min(noteSequence.length - 1, lastNoteIndex + step));
          }
        }
        
        melody.push({
          note: noteSequence[noteIndex],
          time: barStartTime + barTime,
          duration: actualDuration
        });
        
        barTime += actualDuration;
      }
    }
    
    setGeneratedMelody(melody);
    console.log('🎵 Generated melody with timing:', melody.map(n => ({
      note: n.note,
      time: n.time,
      duration: n.duration
    })));
    generateMusicXML(melody);
    setIsGenerating(false);
    toast({
      title: "Melody Generated",
      description: `Generated ${melody.length} notes in ${params.key} major at ${BPM} BPM`
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
    const barsCount = params.measures;
    const [beatsPerMeasure, beatType] = params.timeSignature.split('/').map(Number);
    
    // CRITICAL: Use consistent timing calculations
    const BPM = 120;
    const quarterNoteDuration = 60 / BPM; // 0.5 seconds per quarter note
    const beatDuration = (4 / beatType) * quarterNoteDuration;
    const divisionsPerQuarter = 4; // Standard MusicXML divisions
    
    console.log(`🎼 Generating MusicXML at ${BPM} BPM with ${divisionsPerQuarter} divisions per quarter`);
    
    let bars = '';
    
    for (let bar = 0; bar < barsCount; bar++) {
      const barStartTime = bar * beatsPerMeasure * beatDuration;
      const barEndTime = (bar + 1) * beatsPerMeasure * beatDuration;
      
      // Get notes for this bar
      const barNotes = melody.filter(note => {
        return note.time >= barStartTime && note.time < barEndTime;
      });
      
      console.log(`Bar ${bar + 1}: ${barNotes.length} notes from ${barStartTime}s to ${barEndTime}s`);
      
      bars += `
    <measure number="${bar + 1}">
      ${bar === 0 ? `
      <attributes>
        <divisions>${divisionsPerQuarter}</divisions>
        <key>
          <fifths>${fifths}</fifths>
        </key>
        <time>
          <beats>${beatsPerMeasure}</beats>
          <beat-type>${beatType}</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>` : ''}
      ${barNotes.map(note => {
        if (note.note === 'rest') {
          // Handle rests - convert duration to MusicXML divisions
          const xmlDuration = Math.round((note.duration / quarterNoteDuration) * divisionsPerQuarter);
          const restType = note.duration >= 4 * quarterNoteDuration ? 'whole' : 
                          note.duration >= 2 * quarterNoteDuration ? 'half' : 
                          note.duration >= quarterNoteDuration ? 'quarter' : 
                          note.duration >= quarterNoteDuration / 2 ? 'eighth' : 'sixteenth';
          
          console.log(`Rest: duration=${note.duration}s, xmlDuration=${xmlDuration}, type=${restType}`);
          
          return `
      <note>
        <rest/>
        <duration>${xmlDuration}</duration>
        <type>${restType}</type>
      </note>`;
        } else {
          // Handle pitched notes - convert duration to MusicXML divisions
          const [noteName, octave] = [note.note.slice(0, -1), note.note.slice(-1)];
          const step = noteName.charAt(0);
          const alter = noteName.includes('#') ? 1 : noteName.includes('b') ? -1 : 0;
          const xmlDuration = Math.round((note.duration / quarterNoteDuration) * divisionsPerQuarter);
          const noteType = note.duration >= 4 * quarterNoteDuration ? 'whole' : 
                          note.duration >= 2 * quarterNoteDuration ? 'half' : 
                          note.duration >= quarterNoteDuration ? 'quarter' : 
                          note.duration >= quarterNoteDuration / 2 ? 'eighth' : 'sixteenth';
          
          console.log(`Note ${note.note}: duration=${note.duration}s, xmlDuration=${xmlDuration}, type=${noteType}`);
          
          return `
      <note>
        <pitch>
          <step>${step}</step>
          ${alter !== 0 ? `<alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>${xmlDuration}</duration>
        <type>${noteType}</type>
      </note>`;
        }
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
      {/* Exercise Parameters Ribbon */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/30 border border-border rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Music className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">Exercise Parameters</h3>
            <span className="text-xs text-muted-foreground">• Customize your sight-reading exercise</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Basic Parameters */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Basic Parameters</h4>
              
              {/* Difficulty Level */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Difficulty Level</Label>
                <Select
                  value={params.difficulty.toString()}
                  onValueChange={(value) => setParams({ ...params, difficulty: parseInt(value) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level} {level === 1 ? '(Beginner)' : level === 5 ? '(Advanced)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Key Signature */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Key Signature</Label>
                <Select
                  value={params.key}
                  onValueChange={(value) => setParams({ ...params, key: value })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {keys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key} Major
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Signature */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Time Signature</Label>
                <Select
                  value={params.timeSignature}
                  onValueChange={(value) => setParams({ ...params, timeSignature: value })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {timeSignatures.map((sig) => (
                      <SelectItem key={sig} value={sig}>
                        {sig}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Measures */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Number of Measures</Label>
                <Select
                  value={params.measures.toString()}
                  onValueChange={(value) => setParams({ ...params, measures: parseInt(value) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {measureCounts.map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} measures
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Range */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Voice Range</Label>
                <Select
                  value={params.range}
                  onValueChange={(value) => setParams({ ...params, range: value })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {ranges.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Intervals */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Allowed Intervals</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {intervals.map((interval) => (
                  <div key={interval.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`interval-${interval.value}`}
                      checked={params.intervals.includes(interval.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setParams({
                            ...params,
                            intervals: [...params.intervals, interval.value]
                          });
                        } else {
                          setParams({
                            ...params,
                            intervals: params.intervals.filter(i => i !== interval.value)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`interval-${interval.value}`} className="text-xs">
                      {interval.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Note Values */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Note Values</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {noteValues.map((noteValue) => (
                  <div key={noteValue.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`note-${noteValue.value}`}
                      checked={params.noteValues.includes(noteValue.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setParams({
                            ...params,
                            noteValues: [...params.noteValues, noteValue.value]
                          });
                        } else {
                          setParams({
                            ...params,
                            noteValues: params.noteValues.filter(n => n !== noteValue.value)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`note-${noteValue.value}`} className="text-xs">
                      {noteValue.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Rests and Advanced Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Rests & Options</h4>
              
              {/* Cadence Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cadence-4-bars"
                  checked={params.cadenceEvery4Bars}
                  onCheckedChange={(checked) => 
                    setParams({ ...params, cadenceEvery4Bars: checked as boolean })
                  }
                />
                <Label htmlFor="cadence-4-bars" className="text-xs">
                  Add cadence every 4 bars
                </Label>
              </div>

              {/* Rest Types */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Include Rests</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {restTypes.map((rest) => (
                    <div key={rest.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`rest-${rest.value}`}
                        checked={params.restsToInclude.includes(rest.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setParams({
                              ...params,
                              restsToInclude: [...params.restsToInclude, rest.value]
                            });
                          } else {
                            setParams({
                              ...params,
                              restsToInclude: params.restsToInclude.filter(r => r !== rest.value)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`rest-${rest.value}`} className="text-xs">
                        {rest.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generator Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Generator Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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