import React, { useState, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Music2, Piano, Timer, AudioLines, Gauge } from 'lucide-react';
import { TuningForkIcon } from '@/components/icons/TuningForkIcon';
import { Metronome } from '@/components/sight-singing/Metronome';
import { PitchPipe } from '@/components/pitch-pipe/PitchPipe';
import { VirtualPiano } from '@/components/sight-singing/VirtualPiano';
import { Tuner } from '@/components/tuner/Tuner';
import { useTheme } from '@/contexts/ThemeContext';
import { forceUnlockAudio, setupMobileAudioUnlock } from '@/utils/mobileAudioUnlock';

// Static chromatic ranges
const FULL_PIANO_RANGE = [
  'C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3',
  'C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4',
  'C5','C#5','D5','D#5','E5','F5','F#5','G5'
];

const SMALL_PIANO_RANGE = [
  'C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5'
];

export const MusicalToolkit: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [open, setOpen] = useState<{
    metronome: boolean; pitch: boolean; pianoSmall: boolean; pianoFull: boolean; tuner: boolean;
  }>({ metronome: false, pitch: false, pianoSmall: false, pianoFull: false, tuner: false });

  const [tempo, setTempo] = useState(96);
  const [isMetroPlaying, setIsMetroPlaying] = useState(false);
  const { themeName } = useTheme();
  
  // Theme-specific colors
  const isHbcuTheme = themeName === 'hbcu';
  const isSpelmanBlue = themeName === 'spelman-blue';
  const hbcuGold = '#FFDF00';
  const spelmanWhite = '#ffffff';

  // Setup mobile audio unlock on mount
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  // Pre-unlock audio when dropdown is opened (user gesture)
  const handleDropdownClick = () => {
    forceUnlockAudio();
  };

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Musical Toolkit"
            onClick={handleDropdownClick}
            onTouchStart={handleDropdownClick}
            className="inline-flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-colors hover:bg-white/10"
            style={{ 
              color: isHbcuTheme ? hbcuGold : isSpelmanBlue ? spelmanWhite : '#1e293b'
            }}
          >
            <TuningForkIcon className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-background border border-border shadow-lg z-[9999]" sideOffset={8}>
          <DropdownMenuLabel className="flex items-center gap-2"><Music2 className="h-4 w-4" /> Musical Toolkit</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, metronome: true })); }}>
            <Timer className="mr-2 h-4 w-4" /> Metronome
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, pitch: true })); }}>
            <AudioLines className="mr-2 h-4 w-4" /> Pitch Pipe
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, pianoSmall: true })); }}>
            <Piano className="mr-2 h-4 w-4" /> Small Piano
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, pianoFull: true })); }}>
            <Piano className="mr-2 h-4 w-4" /> Full Piano (C3–G5)
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, tuner: true })); }}>
            <Gauge className="mr-2 h-4 w-4" /> Tuner
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Metronome */}
      <Dialog open={open.metronome} onOpenChange={(v) => setOpen((o) => ({ ...o, metronome: v }))}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base">Metronome</DialogTitle>
          </DialogHeader>
          <Metronome />
        </DialogContent>
      </Dialog>

      {/* Pitch Pipe */}
      <Dialog open={open.pitch} onOpenChange={(v) => setOpen((o) => ({ ...o, pitch: v }))}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base">Pitch Pipe</DialogTitle>
          </DialogHeader>
          <PitchPipe />
        </DialogContent>
      </Dialog>

      {/* Full Piano - Full Screen */}
      {open.pianoFull && (
        <VirtualPiano onClose={() => setOpen((o) => ({ ...o, pianoFull: false }))} />
      )}

      {/* Small Piano */}
      <Dialog open={open.pianoSmall} onOpenChange={(v) => setOpen((o) => ({ ...o, pianoSmall: v }))}>
        <DialogContent className="sm:max-w-[720px] bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base">Small Piano</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <VirtualPiano />
          </div>
        </DialogContent>
      </Dialog>

      {/* Tuner */}
      <Dialog open={open.tuner} onOpenChange={(v) => setOpen((o) => ({ ...o, tuner: v }))}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base">Instrument Tuner</DialogTitle>
          </DialogHeader>
          <Tuner />
        </DialogContent>
      </Dialog>
    </div>
  );
};
