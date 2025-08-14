import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoreDisplayProps {
  musicXML: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ musicXML }) => {
  const scoreRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!scoreRef.current || !musicXML) return;

    const renderScore = async () => {
      try {
        // Dynamic import of VexFlow with proper destructuring
        const VF = await import('vexflow');
        const { Flow } = VF;
        const { Renderer, Stave, StaveNote, Voice, Formatter } = Flow;
        
        // Clear previous score
        scoreRef.current!.innerHTML = '';
        
        // Create SVG renderer
        const renderer = new Renderer(scoreRef.current!, Renderer.Backends.SVG);
        renderer.resize(800, 200);
        const context = renderer.getContext();
        
        // Parse basic info from MusicXML
        const { notes, keySignature, timeSignature } = parseMusicXMLForVexFlow(musicXML);
        
        // Create a stave
        const stave = new Stave(10, 40, 750);
        stave.addClef("treble");
        stave.addTimeSignature(timeSignature);
        
        // Add key signature if not C major
        if (keySignature !== "C") {
          stave.addKeySignature(keySignature);
        }
        
        stave.setContext(context).draw();
        
        // Create notes for VexFlow
        const vexFlowNotes = notes.map(note => 
          new StaveNote({
            clef: "treble",
            keys: [`${note.step}/${note.octave}`],
            duration: note.duration
          })
        );
        
        if (vexFlowNotes.length > 0) {
          // Create a voice and add notes
          const voice = new Voice({ num_beats: 4, beat_value: 4 });
          voice.addTickables(vexFlowNotes);
          
          // Format and draw
          const formatter = new Formatter().joinVoices([voice]).format([voice], 700);
          voice.draw(context, stave);
        }

      } catch (error) {
        console.error("Error rendering score:", error);
        // Fallback to simple display
        if (scoreRef.current) {
          scoreRef.current.innerHTML = `
            <div class="p-4 text-center text-muted-foreground">
              <p>Musical notation display</p>
              <p class="text-sm">Exercise generated successfully</p>
            </div>
          `;
        }
      }
    };

    renderScore();
  }, [musicXML]);

  const parseMusicXMLForVexFlow = (xml: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      
      const notes: Array<{step: string, octave: number, duration: string}> = [];
      const noteElements = xmlDoc.querySelectorAll('note');
      
      noteElements.forEach(noteEl => {
        const pitchEl = noteEl.querySelector('pitch');
        const typeEl = noteEl.querySelector('type');
        
        if (pitchEl && typeEl) {
          const step = pitchEl.querySelector('step')?.textContent || 'C';
          const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4');
          const type = typeEl.textContent || 'quarter';
          
          // Convert MusicXML duration to VexFlow duration
          const durationMap: {[key: string]: string} = {
            'whole': 'w',
            'half': 'h', 
            'quarter': 'q',
            'eighth': '8',
            'sixteenth': '16'
          };
          
          notes.push({
            step: step.toLowerCase(),
            octave,
            duration: durationMap[type] || 'q'
          });
        }
      });
      
      // Extract key and time signature
      const keyEl = xmlDoc.querySelector('fifths');
      const timeBeats = xmlDoc.querySelector('beats')?.textContent || '4';
      const timeBeatType = xmlDoc.querySelector('beat-type')?.textContent || '4';
      
      const keySignature = keyEl ? getKeySignatureFromFifths(parseInt(keyEl.textContent || '0')) : 'C';
      const timeSignature = `${timeBeats}/${timeBeatType}`;
      
      return { notes, keySignature, timeSignature };
    } catch (error) {
      console.error("Error parsing MusicXML:", error);
      return { 
        notes: [{ step: 'c', octave: 4, duration: 'q' }], 
        keySignature: 'C', 
        timeSignature: '4/4' 
      };
    }
  };

  const getKeySignatureFromFifths = (fifths: number): string => {
    const keys = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
    return keys[fifths + 7] || 'C';
  };

  const handleDownloadMusicXML = () => {
    try {
      const blob = new Blob([musicXML], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sight-singing-exercise.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "MusicXML file is downloading",
      });
    } catch (error) {
      console.error('Error downloading MusicXML:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download MusicXML file",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Musical Score</h3>
          {musicXML && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadMusicXML}
            >
              <Download className="h-4 w-4 mr-2" />
              Download MusicXML
            </Button>
          )}
        </div>
        
        <div 
          ref={scoreRef}
          className="min-h-[300px] bg-background rounded-lg border p-4 overflow-auto"
        />
        
        {!musicXML && (
          <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
            Generate an exercise to see the musical notation
          </div>
        )}
      </CardContent>
    </Card>
  );
};