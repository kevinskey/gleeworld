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
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

export const MusicalToolkit: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [open, setOpen] = useState<{
    metronome: boolean; pitch: boolean; piano: boolean; tuner: boolean;
  }>({ metronome: false, pitch: false, piano: false, tuner: false });

  const [pitchPipeSize, setPitchPipeSize] = useState({ width: 280, height: 280 });

  const [metronomeSize, setMetronomeSize] = useState({ width: 480, height: 620 });
  const [metronomePosition, setMetronomePosition] = useState({ x: 100, y: 100 });

  const [tempo, setTempo] = useState(96);
  const [isMetroPlaying, setIsMetroPlaying] = useState(false);
  const { themeName } = useTheme();
  const isMobile = useIsMobile();
  
  // Single opinionated theme — no conditional styling
  const isHbcuTheme = false;
  const isBrandBlue = false;

  // Restore piano state if the header/toolkit remounts during orientation change
  useEffect(() => {
    try {
      const shouldReopen = sessionStorage.getItem('gw_toolkit_piano_open') === '1';
      if (shouldReopen) {
        setOpen((o) => ({ ...o, piano: true }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist piano open state so it survives header swaps on rotation
  useEffect(() => {
    try {
      sessionStorage.setItem('gw_toolkit_piano_open', open.piano ? '1' : '0');
    } catch {
      // ignore
    }
  }, [open.piano]);

  // Setup mobile audio unlock on mount
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  // Size pitch pipe to fit the screen on open
  useEffect(() => {
    if (open.pitch) {
      const size = Math.min(window.innerWidth - 40, window.innerHeight - 160, 420);
      setPitchPipeSize({ width: size, height: size });
    }
  }, [open.pitch]);

  // Center metronome on open, bigger on desktop
  useEffect(() => {
    if (open.metronome) {
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const isMobileSize = sw < 640;
      const w = isMobileSize ? Math.min(sw - 32, 360) : 480;
      const h = isMobileSize ? Math.min(sh - 100, 520) : 620;
      setMetronomeSize({ width: w, height: h });
      setMetronomePosition({
        x: Math.max(10, (sw - w) / 2),
        y: Math.max(10, (sh - h) / 2),
      });
    }
  }, [open.metronome]);

  // Pre-unlock audio when dropdown is opened (user gesture)
  const handleDropdownClick = () => {
    forceUnlockAudio();
  };

  return (
    <div className={className}>
      <DropdownMenu>
        <EnhancedTooltip content="Musical Toolkit">
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Musical Toolkit"
              onClick={handleDropdownClick}
              onTouchStart={handleDropdownClick}
              className={`inline-flex items-center justify-center ${HEADER_ICON_SIZES.button} p-0 transition-colors hover:bg-muted rounded-full text-current`}
            >
              <Piano className={HEADER_ICON_SIZES.icon} />
            </button>
          </DropdownMenuTrigger>
        </EnhancedTooltip>
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

      {/* Metronome - Draggable and Resizable */}
      {open.metronome && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <Rnd
            size={{ width: metronomeSize.width, height: metronomeSize.height }}
            position={{ x: metronomePosition.x, y: metronomePosition.y }}
            onDragStop={(e, d) => setMetronomePosition({ x: d.x, y: d.y })}
            onResizeStop={(e, direction, ref, delta, position) => {
              setMetronomeSize({ width: ref.offsetWidth, height: ref.offsetHeight });
              setMetronomePosition(position);
            }}
            minWidth={280}
            minHeight={400}
            maxWidth={Math.min(700, window.innerWidth - 20)}
            maxHeight={Math.min(800, window.innerHeight - 40)}
            bounds="window"
            dragHandleClassName="metronome-drag-handle"
            className="pointer-events-auto"
          >
            <div className="relative w-full h-full bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
              {/* Close button */}
              <button
                onClick={() => setOpen((o) => ({ ...o, metronome: false }))}
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center shadow transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Drag handle */}
              <div className="metronome-drag-handle flex items-center justify-center gap-2 py-2 cursor-move bg-muted/50 border-b border-border select-none">
                <GripHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Metronome</span>
                <GripHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Resize indicator */}
              <div className="absolute bottom-1 right-1 z-10 w-5 h-5 text-muted-foreground cursor-se-resize">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21L12 21M21 21L21 12M21 21L9 9" />
                </svg>
              </div>

              {/* Metronome content - scaled to fill */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                <div className="w-full max-w-lg">
                  <Metronome />
                </div>
              </div>
            </div>
          </Rnd>
        </div>
      )}

      {/* Pitch Pipe - fixed, centered, not movable or resizable */}
      {open.pitch && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div
            className="relative pointer-events-auto flex items-center justify-center"
            style={{ width: pitchPipeSize.width, height: pitchPipeSize.height }}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen((o) => ({ ...o, pitch: false }))}
              className="absolute top-0 right-0 z-10 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* PitchPipe renders at a fixed 384px (w-96); scale it to fit */}
            <div style={{ transform: `scale(${pitchPipeSize.width / 384})`, transformOrigin: 'center' }}>
              <PitchPipe />
            </div>
          </div>
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
