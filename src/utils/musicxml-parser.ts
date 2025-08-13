/**
 * Simple MusicXML parser for extracting notes and timing
 */

export interface ParsedNote {
  pitch: string;
  duration: number; // in beats
  startBeat: number;
}

export interface ParsedExercise {
  notes: ParsedNote[];
  totalBeats: number;
  timeSignature: string;
  keySignature: string;
}

export function parseMusicXMLForPlayback(musicXML: string): ParsedExercise {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(musicXML, 'application/xml');
    
    // Extract time signature
    const timeElement = xmlDoc.querySelector('time beats, time > beats');
    const beatTypeElement = xmlDoc.querySelector('time beat-type, time > beat-type');
    const timeSignature = timeElement && beatTypeElement 
      ? `${timeElement.textContent}/${beatTypeElement.textContent}`
      : '4/4';
    
    // Extract key signature (simplified)
    const fifthsElement = xmlDoc.querySelector('key fifths, key > fifths');
    const keySignature = fifthsElement ? 'C major' : 'C major'; // Simplified for now
    
    // Get divisions (ticks per quarter note)
    const divisionsElement = xmlDoc.querySelector('divisions');
    const divisions = divisionsElement ? parseInt(divisionsElement.textContent || '4') : 4;
    
    // Extract notes
    const notes: ParsedNote[] = [];
    let currentBeat = 0;
    
    const measures = xmlDoc.querySelectorAll('measure');
    
    measures.forEach((measure) => {
      const noteElements = measure.querySelectorAll('note');
      
      noteElements.forEach((noteElement) => {
        // Skip rests
        const restElement = noteElement.querySelector('rest');
        if (restElement) {
          // Handle rest duration
          const durationElement = noteElement.querySelector('duration');
          if (durationElement) {
            const durationTicks = parseInt(durationElement.textContent || '0');
            const durationBeats = durationTicks / divisions;
            currentBeat += durationBeats;
          }
          return;
        }
        
        // Get pitch
        const pitchElement = noteElement.querySelector('pitch');
        if (!pitchElement) return;
        
        const stepElement = pitchElement.querySelector('step');
        const octaveElement = pitchElement.querySelector('octave');
        const alterElement = pitchElement.querySelector('alter');
        
        if (!stepElement || !octaveElement) return;
        
        const step = stepElement.textContent || 'C';
        const octave = octaveElement.textContent || '4';
        const alter = alterElement ? parseInt(alterElement.textContent || '0') : 0;
        
        // Build pitch string
        let pitch = step;
        if (alter === 1) pitch += '#';
        else if (alter === -1) pitch += 'b';
        pitch += octave;
        
        // Get duration
        const durationElement = noteElement.querySelector('duration');
        const durationTicks = durationElement ? parseInt(durationElement.textContent || '0') : divisions;
        const durationBeats = durationTicks / divisions;
        
        notes.push({
          pitch,
          duration: durationBeats,
          startBeat: currentBeat
        });
        
        currentBeat += durationBeats;
      });
    });
    
    console.log('Parsed notes from MusicXML:', { notes, totalBeats: currentBeat, timeSignature });
    
    return {
      notes,
      totalBeats: currentBeat,
      timeSignature,
      keySignature
    };
    
  } catch (error) {
    console.error('Error parsing MusicXML:', error);
    return {
      notes: [],
      totalBeats: 0,
      timeSignature: '4/4',
      keySignature: 'C major'
    };
  }
}