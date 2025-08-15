export interface ParsedNote {
  step: string;
  octave: number;
  frequency: number;
  duration: number; // in seconds
  startTime: number; // in seconds from beginning
}

export interface ParsedMeasure {
  number: number;
  notes: ParsedNote[];
}

export interface ParsedScore {
  measures: ParsedMeasure[];
  tempo: number;
  timeSignature: { beats: number; beatType: number };
  totalDuration: number;
}

// Note frequencies (A4 = 440Hz)
const NOTE_FREQUENCIES: { [key: string]: number } = {
  'C': 261.63,
  'D': 293.66,
  'E': 329.63,
  'F': 349.23,
  'G': 392.00,
  'A': 440.00,
  'B': 493.88
};

function getNoteFrequency(step: string, octave: number, alter: number = 0): number {
  const baseFreq = NOTE_FREQUENCIES[step.toUpperCase()];
  if (!baseFreq) return 440; // Default to A4
  
  // Calculate frequency for the specific octave
  // A4 is in octave 4, so we adjust from there
  const octaveAdjustment = octave - 4;
  let frequency = baseFreq * Math.pow(2, octaveAdjustment);
  
  // Apply accidentals (sharps/flats)
  // Each semitone is a factor of 2^(1/12)
  if (alter !== 0) {
    frequency *= Math.pow(2, alter / 12);
  }
  
  return frequency;
}

function parseDuration(durationType: string, divisions: number): number {
  // Convert note type to duration in quarter notes
  const durations: { [key: string]: number } = {
    'whole': 4,
    'half': 2,
    'quarter': 1,
    'eighth': 0.5,
    'sixteenth': 0.25
  };
  
  return durations[durationType] || 1;
}

export function parseMusicXML(musicXMLString: string, tempo: number = 120): ParsedScore {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(musicXMLString, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('XML parsing error:', parserError.textContent);
      return createFallbackScore(tempo);
    }

    const measures: ParsedMeasure[] = [];
    let divisions = 4; // Default divisions per quarter note
    let timeSignature = { beats: 4, beatType: 4 };

    // Get time signature and divisions from first part's first measure
    const firstPart = xmlDoc.querySelector('part');
    const firstMeasure = firstPart?.querySelector('measure');
    if (firstMeasure) {
      const attributesEl = firstMeasure.querySelector('attributes');
      if (attributesEl) {
        const divisionsEl = attributesEl.querySelector('divisions');
        if (divisionsEl) {
          divisions = parseInt(divisionsEl.textContent || '4');
        }
        
        const timeEl = attributesEl.querySelector('time');
        if (timeEl) {
          const beats = timeEl.querySelector('beats')?.textContent;
          const beatType = timeEl.querySelector('beat-type')?.textContent;
          if (beats && beatType) {
            timeSignature = { beats: parseInt(beats), beatType: parseInt(beatType) };
          }
        }
      }
    }

    // Calculate seconds per quarter note based on tempo
    const secondsPerQuarter = 60 / tempo;

    // Get all parts and find the maximum number of measures
    const partElements = xmlDoc.querySelectorAll('part');
    console.log(`Found ${partElements.length} parts in MusicXML`);
    
    if (partElements.length === 0) {
      console.warn('No parts found, falling back to legacy parsing');
      return parseSinglePart(xmlDoc, tempo, divisions, timeSignature, secondsPerQuarter);
    }

    // Find the maximum number of measures across all parts
    let maxMeasures = 0;
    partElements.forEach(part => {
      const measureCount = part.querySelectorAll('measure').length;
      maxMeasures = Math.max(maxMeasures, measureCount);
    });

    // Parse each measure across all parts
    for (let measureIndex = 0; measureIndex < maxMeasures; measureIndex++) {
      const measureNumber = measureIndex + 1;
      const allNotesInMeasure: ParsedNote[] = [];

      // Calculate measure start time
      let measureStartTime = 0;
      if (measureIndex > 0) {
        // Calculate duration of previous measures
        const beatsPerMeasure = timeSignature.beats;
        const quarterNotesPerBeat = 4 / timeSignature.beatType;
        const quarterNotesPerMeasure = beatsPerMeasure * quarterNotesPerBeat;
        measureStartTime = measureIndex * quarterNotesPerMeasure * secondsPerQuarter;
      }

      // Parse this measure from each part
      partElements.forEach((part, partIndex) => {
        const measureEl = part.querySelectorAll('measure')[measureIndex];
        if (!measureEl) return;

        let noteTimeInMeasure = 0;
        const noteElements = measureEl.querySelectorAll('note');
        
        noteElements.forEach((noteEl) => {
          // Skip rests
          const restEl = noteEl.querySelector('rest');
          if (restEl) {
            const durationEl = noteEl.querySelector('duration');
            if (durationEl) {
              const durationValue = parseInt(durationEl.textContent || '0');
              const quarterNotes = durationValue / divisions;
              noteTimeInMeasure += quarterNotes * secondsPerQuarter;
            }
            return;
          }

          const pitchEl = noteEl.querySelector('pitch');
          const durationEl = noteEl.querySelector('duration');

          if (pitchEl && durationEl) {
            const step = pitchEl.querySelector('step')?.textContent || 'C';
            const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4');
            const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0');
            const durationValue = parseInt(durationEl.textContent || '0');
            
            // Calculate duration in seconds
            const quarterNotes = durationValue / divisions;
            const durationSeconds = quarterNotes * secondsPerQuarter;
            
            const frequency = getNoteFrequency(step, octave, alter);
            
            allNotesInMeasure.push({
              step,
              octave,
              frequency,
              duration: durationSeconds,
              startTime: measureStartTime + noteTimeInMeasure
            });

            noteTimeInMeasure += durationSeconds;
          }
        });
      });

      measures.push({
        number: measureNumber,
        notes: allNotesInMeasure
      });
    }

    // Calculate total duration
    const totalDuration = measures.length > 0 ? 
      Math.max(...measures.flatMap(m => m.notes.map(n => n.startTime + n.duration))) : 0;

    console.log(`Parsed ${partElements.length} parts with ${measures.length} measures, total duration: ${totalDuration}s`);

    return {
      measures,
      tempo,
      timeSignature,
      totalDuration
    };
  } catch (error) {
    console.error('Error parsing MusicXML:', error);
    return createFallbackScore(tempo);
  }
}

// Legacy single-part parsing (fallback)
function parseSinglePart(xmlDoc: Document, tempo: number, divisions: number, timeSignature: any, secondsPerQuarter: number): ParsedScore {
  const measures: ParsedMeasure[] = [];
  let currentTime = 0;

  // Parse each measure
  const measureElements = xmlDoc.querySelectorAll('measure');
  measureElements.forEach((measureEl, measureIndex) => {
    const measureNumber = parseInt(measureEl.getAttribute('number') || (measureIndex + 1).toString());
    const notes: ParsedNote[] = [];
    let measureTime = currentTime;

    // Parse notes in this measure
    const noteElements = measureEl.querySelectorAll('note');
    noteElements.forEach((noteEl) => {
      // Skip rests
      const restEl = noteEl.querySelector('rest');
      if (restEl) {
        // Handle rest duration
        const durationEl = noteEl.querySelector('duration');
        if (durationEl) {
          const durationValue = parseInt(durationEl.textContent || '0');
          const quarterNotes = durationValue / divisions;
          measureTime += quarterNotes * secondsPerQuarter;
        }
        return;
      }

      const pitchEl = noteEl.querySelector('pitch');
      const durationEl = noteEl.querySelector('duration');

      if (pitchEl && durationEl) {
        const step = pitchEl.querySelector('step')?.textContent || 'C';
        const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4');
        const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0');
        const durationValue = parseInt(durationEl.textContent || '0');
        
        // Calculate duration in seconds
        const quarterNotes = durationValue / divisions;
        const durationSeconds = quarterNotes * secondsPerQuarter;
        
        const frequency = getNoteFrequency(step, octave, alter);
        
        notes.push({
          step,
          octave,
          frequency,
          duration: durationSeconds,
          startTime: measureTime
        });

        measureTime += durationSeconds;
      }
    });

    measures.push({
      number: measureNumber,
      notes
    });

    currentTime = measureTime;
  });

  return {
    measures,
    tempo,
    timeSignature,
    totalDuration: currentTime
  };
}

function createFallbackScore(tempo: number): ParsedScore {
  // Create a simple C major scale as fallback
  const notes = ['C', 'D', 'E', 'F'].map((step, index) => ({
    step,
    octave: 4,
    frequency: getNoteFrequency(step, 4),
    duration: 0.5,
    startTime: index * 0.5
  }));

  return {
    measures: [{
      number: 1,
      notes
    }],
    tempo,
    timeSignature: { beats: 4, beatType: 4 },
    totalDuration: 2
  };
}