import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Music2, Piano, Timer, AudioLines, Gauge, X, GripHorizontal } from 'lucide-react';
import { TuningForkIcon } from '@/components/icons/TuningForkIcon';
import { Metronome } from '@/components/sight-singing/Metronome';
import { PitchPipe } from '@/components/pitch-pipe/PitchPipe';
import { VirtualPiano } from '@/components/sight-singing/VirtualPiano';
import { Tuner } from '@/components/tuner/Tuner';
import { useTheme } from '@/contexts/ThemeContext';
import { forceUnlockAudio, setupMobileAudioUnlock } from '@/utils/mobileAudioUnlock';
import { useIsMobile } from '@/hooks/use-mobile';
import { HEADER_ICON_SIZES } from '@/components/layout/headerIconSizes';

export const MusicalToolkit: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [open, setOpen] = useState<{
    metronome: boolean; pitch: boolean; piano: boolean; tuner: boolean;
  }>({ metronome: false, pitch: false, piano: false, tuner: false });

  const [pitchPipeSize, setPitchPipeSize] = useState({ width: 280, height: 280 });
  const [pitchPipePosition, setPitchPipePosition] = useState({ x: 20, y: 80 });

  const [tempo, setTempo] = useState(96);
  const [isMetroPlaying, setIsMetroPlaying] = useState(false);
  const { themeName } = useTheme();
  const isMobile = useIsMobile();
  
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

  // Center pitch pipe on open, size based on screen
  useEffect(() => {
    if (open.pitch) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isMobileSize = screenWidth < 400;
      const initialSize = isMobileSize ? Math.min(screenWidth - 40, 260) : 280;
      setPitchPipeSize({ width: initialSize, height: initialSize });
      const centerX = (screenWidth - initialSize) / 2;
      const centerY = (screenHeight - initialSize) / 2;
      setPitchPipePosition({ x: Math.max(10, centerX), y: Math.max(60, centerY) });
    }
  }, [open.pitch]);

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
            className={`inline-flex items-center justify-center ${HEADER_ICON_SIZES.button} p-0 transition-colors hover:bg-muted rounded-full text-current`}
          >
            <Piano className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={isMobile ? "center" : "end"} 
          className="w-52 bg-popover text-popover-foreground border border-border shadow-2xl z-[9999]" 
          sideOffset={20}
        >
          <DropdownMenuLabel className="flex items-center gap-2"><Music2 className="h-4 w-4" /> Musical Toolkit</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, metronome: true })); }}>
            <Timer className="mr-2 h-4 w-4" /> Metronome
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, pitch: true })); }}>
            <AudioLines className="mr-2 h-4 w-4" /> Pitch Pipe
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, piano: true })); }}>
            <Piano className="mr-2 h-4 w-4" /> Piano
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { forceUnlockAudio(); setOpen((o) => ({ ...o, tuner: true })); }}>
            <Gauge className="mr-2 h-4 w-4" /> Tuner
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Metronome */}
      <Dialog open={open.metronome} onOpenChange={(v) => setOpen((o) => ({ ...o, metronome: v }))}>
        <DialogContent className="sm:max-w-md bg-background border border-border top-[15%] translate-y-0 sm:top-[20%]">
          <DialogHeader>
            <DialogTitle className="text-base">Metronome</DialogTitle>
          </DialogHeader>
          <Metronome />
        </DialogContent>
      </Dialog>

      {/* Pitch Pipe - Draggable and Resizable */}
      {open.pitch && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <Rnd
            size={{ width: pitchPipeSize.width, height: pitchPipeSize.height }}
            position={{ x: pitchPipePosition.x, y: pitchPipePosition.y }}
            onDragStop={(e, d) => setPitchPipePosition({ x: d.x, y: d.y })}
            onResizeStop={(e, direction, ref, delta, position) => {
              const size = Math.min(ref.offsetWidth, ref.offsetHeight);
              setPitchPipeSize({ width: size, height: size });
              setPitchPipePosition(position);
            }}
            lockAspectRatio={true}
            minWidth={150}
            minHeight={150}
            maxWidth={Math.min(500, window.innerWidth - 20)}
            maxHeight={Math.min(500, window.innerHeight - 100)}
            bounds="window"
            dragHandleClassName="pitch-pipe-drag-handle"
            className="pointer-events-auto"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={() => setOpen((o) => ({ ...o, pitch: false }))}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center shadow-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Drag handle */}
              <div className="pitch-pipe-drag-handle absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-white cursor-move flex items-center gap-1 shadow-lg">
                <GripHorizontal className="h-3 w-3" />
                <span className="text-[10px]">Drag</span>
              </div>

              {/* Resize indicator */}
              <div className="absolute -bottom-2 -right-2 z-10 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg cursor-se-resize">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21L12 21M21 21L21 12M21 21L9 9" />
                </svg>
              </div>
              
              <div style={{ transform: `scale(${pitchPipeSize.width / 264})`, transformOrigin: 'center' }}>
                <PitchPipe />
              </div>
            </div>
          </Rnd>
        </div>
      )}

      {/* Piano - Full Screen Responsive */}
      {open.piano && (
        <VirtualPiano onClose={() => setOpen((o) => ({ ...o, piano: false }))} />
      )}

      {/* Tuner */}
      <Dialog open={open.tuner} onOpenChange={(v) => setOpen((o) => ({ ...o, tuner: v }))}>
        <DialogContent className="sm:max-w-md bg-background border border-border top-[15%] translate-y-0 sm:top-[20%]">
          <DialogHeader>
            <DialogTitle className="text-base">Instrument Tuner</DialogTitle>
          </DialogHeader>
          <Tuner />
        </DialogContent>
      </Dialog>
    </div>
  );
};
