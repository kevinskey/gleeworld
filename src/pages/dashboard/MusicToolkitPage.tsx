// Music Toolkit — all four instruments on one no-scroll page.
// Top row: Metronome, Pitch Pipe, Tuner compressed to a uniform compact
// height. Bottom: full-width Piano. Each card uses the SOFT_CARD style
// shared with the rest of the redesigns.

import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Timer, AudioLines, Gauge, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMetronome } from '@/components/sight-singing/hooks/useMetronome';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';
import { PitchPipe } from '@/components/pitch-pipe/PitchPipe';
import { VirtualPiano } from '@/components/sight-singing/VirtualPiano';
import { Tuner } from '@/components/tuner/Tuner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

// Compact card height for the top-row tools. Tools that render at their
// native size get scaled into this box via CSS transform.
const TOP_CARD_HEIGHT = 260;

export default function MusicToolkitPage() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Music Toolkit"
      maxWidth="7xl"
      subtitle="Metronome, pitch pipe, tuner, and a full keyboard — everything on one screen."
    >
      {/* Top row — three small tools */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ToolCard title="Metronome" icon={Timer} iconBg="bg-sky-50" iconFg="text-sky-600">
          <CompactMetronome />
        </ToolCard>

        <ToolCard title="Pitch Pipe" icon={AudioLines} iconBg="bg-purple-50" iconFg="text-purple-600">
          <FixedScaled nativeSize={384} targetSize={180}>
            <PitchPipe />
          </FixedScaled>
        </ToolCard>

        <ToolCard title="Tuner" icon={Gauge} iconBg="bg-emerald-50" iconFg="text-emerald-600">
          <ScaledShrink scale={0.85}>
            <Tuner />
          </ScaledShrink>
        </ToolCard>
      </div>

      {/* Bottom — full width piano. The VirtualPiano carries its own
          controls row ("Piano | C3-B4 | Acoustic Piano …"), so we don't
          add a redundant card header above it. */}
      <Card className={SOFT_CARD + ' overflow-hidden'} style={SOFT_CARD_STYLE}>
        <CardContent className="p-0">
          <VirtualPiano />
        </CardContent>
      </Card>
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

function ToolCard({
  title, icon: Icon, iconBg, iconFg, children,
}: {
  title: string;
  icon: React.ElementType;
  iconBg: string; iconFg: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 flex flex-col" style={{ height: TOP_CARD_HEIGHT }}>
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <div className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconFg}`} />
          </div>
          <h2 className="font-semibold text-lg leading-tight">{title}</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// Wraps native-sized instrument widgets and scales them down to fit a
// compact card. `center` centers the scaled content within the box.
function ScaledShrink({
  scale, center, children,
}: {
  scale: number; center?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={center ? 'h-full flex items-center justify-center' : 'h-full overflow-hidden'}>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: center ? 'center center' : 'top left',
          width: center ? 'auto' : `${100 / scale}%`,
          height: center ? 'auto' : `${100 / scale}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Tight metronome built directly on top of `useMetronome` so the play
// button stays inside the compact card (the full <Metronome /> is too tall
// at any reasonable scale and the Start button ends up clipped offscreen).
function CompactMetronome() {
  const { isPlaying, startMetronome, stopMetronome, tempo, updateTempo } = useMetronome();
  const handlePlayStop = () => {
    forceUnlockAudio();
    if (isPlaying) stopMetronome(); else startMetronome();
  };
  return (
    <div className="h-full flex flex-col items-center justify-between py-2">
      <div className="text-center">
        <div className="text-4xl font-bold leading-none">{tempo}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">BPM</div>
      </div>
      <Slider
        value={[tempo]}
        onValueChange={(v) => updateTempo(v[0])}
        min={40}
        max={200}
        step={1}
        className="w-full"
      />
      <Button
        variant={isPlaying ? 'destructive' : 'default'}
        size="sm"
        onClick={handlePlayStop}
        onPointerDown={() => forceUnlockAudio()}
        onTouchStart={() => forceUnlockAudio()}
        className="w-full touch-manipulation"
      >
        {isPlaying ? <><Square className="h-4 w-4 mr-1.5" />Stop</> : <><Play className="h-4 w-4 mr-1.5" />Start</>}
      </Button>
    </div>
  );
}

// Renders a fixed native-sized widget (e.g. the 384px PitchPipe) inside a
// fixed pixel box so the OUTER box matches the scaled visual size — no
// phantom whitespace from `transform: scale`. Used when content height
// and width are known in advance.
function FixedScaled({
  nativeSize, targetSize, children,
}: {
  nativeSize: number; targetSize: number; children: React.ReactNode;
}) {
  const scale = targetSize / nativeSize;
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div
        style={{
          width: targetSize,
          height: targetSize,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: nativeSize,
            height: nativeSize,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
