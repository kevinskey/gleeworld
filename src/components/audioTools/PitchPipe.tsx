import { useState, useSyncExternalStore } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Tone from 'tone';
import { Slider } from '@/components/ui/slider';
import {
  playPitchPipe, stopPitchPipe, PITCH_PIPE_NOTES, type PitchClass,
  getPitchPipeVolume, setPitchPipeVolume, subscribePitchPipeVolume,
} from '@/lib/audioTools/pitchPipe';
import { forceAudioUnlock } from '@/lib/audioTools/unlock';

interface PitchPipeProps {
  className?: string;
}

// Circular Master-Key style chromatic pitch pipe. 12 pitches arranged
// around the rim, each as a press-and-hold wedge that sustains a flute
// tone for as long as the user keeps their finger down.
//
// Fixed at the octave starting on C4 — that's the traditional chromatic
// pitch pipe range (C4 through B4) and the most useful for choir warm-ups
// + sight-singing reference. No octave selector to fiddle with.

const FIXED_OCTAVE = 4;

// 12 chromatic pitches, C at 12 o'clock, walking clockwise.
const NOTES_CLOCKWISE: PitchClass[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const VIEWBOX = 420;
const CX = VIEWBOX / 2;
const CY = VIEWBOX / 2;

// Concentric radii — outer rim, note ring, hub.
const R_RIM_OUTER = 205;
const R_RIM_INNER = 188;
const R_NOTES_OUTER = 188;
const R_NOTES_INNER = 96;
const R_HUB = 58;
const R_HUB_BOLT = 22;

// Angle helpers — SVG y-axis runs down, so 12-o'clock is angle -90°.
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function wedgePath(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number) {
  const p1 = polar(cx, cy, rOuter, startDeg);
  const p2 = polar(cx, cy, rOuter, endDeg);
  const p3 = polar(cx, cy, rInner, endDeg);
  const p4 = polar(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function PitchPipe({ className }: PitchPipeProps) {
  const [sounding, setSounding] = useState<PitchClass | null>(null);
  const volume = useSyncExternalStore(
    subscribePitchPipeVolume, getPitchPipeVolume, getPitchPipeVolume,
  );
  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  // Press-and-hold model — start the tone on pointer down, stop on
  // pointer up / leave / cancel. Mimics blowing into a physical pitch
  // pipe and lets the user check a pitch by tapping briefly without
  // needing a separate Stop control.
  const beginNote = (n: PitchClass) => {
    forceAudioUnlock();
    Tone.start().catch(() => {});
    playPitchPipe(n, FIXED_OCTAVE);
    setSounding(n);
  };
  const endNote = () => {
    stopPitchPipe();
    setSounding(null);
  };

  // 12 notes × 30° per wedge. Wedges are centered on each note position
  // (C is centered on the 12-o'clock line, so the wedge spans -105 → -75).
  const noteWedges = NOTES_CLOCKWISE.map((note, i) => {
    const center = i * 30;          // 0 = C at top, walking clockwise
    const start = center - 15;
    const end = center + 15;
    const labelPos = polar(CX, CY, (R_NOTES_OUTER + R_NOTES_INNER) / 2, center);
    return { note, start, end, labelX: labelPos.x, labelY: labelPos.y, center };
  });

  return (
    <div className={cn('p-3 bg-card border rounded-lg flex flex-col items-center gap-2', className)}>
      <div className="w-full flex items-center justify-between">
        <div className="text-sm font-semibold">Pitch Pipe</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          C4 – B4
        </div>
      </div>

      {/* Level. The tone is a reference pitch people hold under singing, so
          the right volume depends on the room — a rehearsal hall wants it
          near the top, a desk does not. Applies live: the master gain ramps
          while a note is sounding. */}
      <div className="w-full flex items-center gap-2">
        <VolumeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <Slider
          value={[volume]}
          onValueChange={([v]) => setPitchPipeVolume(v)}
          min={0}
          max={100}
          step={1}
          aria-label="Pitch pipe volume"
          className="flex-1"
        />
        <span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right">{volume}</span>
      </div>

      {/* The SVG fills the card's available width, capped by height so
          the panel doesn't grow past the Metronome's footprint. Drop
          shadow is rendered inside the SVG (filter) so it stays attached
          to the disc rather than the rectangular wrapper. */}
      <svg
        viewBox={`-20 -20 ${VIEWBOX + 40} ${VIEWBOX + 40}`}
        className="w-full max-h-[260px] aspect-square select-none touch-manipulation"
        role="group"
        aria-label="Chromatic pitch pipe"
      >
        <defs>
          {/* Brass gradient for the face. */}
          <radialGradient id="pp-face" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="55%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
          <radialGradient id="pp-rim" cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#7c2d12" />
          </radialGradient>
          <radialGradient id="pp-hub" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#92400e" />
          </radialGradient>
          <radialGradient id="pp-bolt" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>

          {/* Drop shadow filter — soft Gaussian-blurred offset under the
              brass disc so it lifts off the card surface. */}
          <filter id="pp-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
            <feOffset dx="0" dy="6" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.45" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Curved text paths — top arc + bottom arc. */}
          <path
            id="pp-arc-top"
            d={`M ${polar(CX, CY, 140, 250).x} ${polar(CX, CY, 140, 250).y}
                A 140 140 0 0 1 ${polar(CX, CY, 140, 110).x} ${polar(CX, CY, 140, 110).y}`}
            fill="none"
          />
          <path
            id="pp-arc-bottom"
            d={`M ${polar(CX, CY, 80, 200).x} ${polar(CX, CY, 80, 200).y}
                A 80 80 0 0 0 ${polar(CX, CY, 80, 340).x} ${polar(CX, CY, 80, 340).y}`}
            fill="none"
          />
        </defs>

        {/* Outer rim — wrapped in a group so the drop shadow is applied
            once to the whole disc instead of layering on each circle. */}
        <g filter="url(#pp-shadow)">
          <circle cx={CX} cy={CY} r={R_RIM_OUTER} fill="url(#pp-rim)" />
          <circle cx={CX} cy={CY} r={R_RIM_INNER} fill="url(#pp-face)" />
        </g>

        {/* Note wedges — interactive. */}
        {noteWedges.map(({ note, start, end, labelX, labelY, center }) => {
          const active = sounding === note;
          const isSharp = note.includes('#');
          return (
            <g
              key={note}
              onPointerDown={(e) => {
                (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
                beginNote(note);
              }}
              onPointerUp={endNote}
              onPointerLeave={() => { if (sounding === note) endNote(); }}
              onPointerCancel={endNote}
              style={{ cursor: 'pointer', touchAction: 'none' }}
              aria-label={`Sound ${note}${FIXED_OCTAVE}`}
            >
              <path
                d={wedgePath(CX, CY, R_NOTES_OUTER, R_NOTES_INNER, start, end)}
                fill={active ? '#7c2d12' : 'transparent'}
                stroke={active ? '#451a03' : 'rgba(120, 53, 15, 0.35)'}
                strokeWidth={active ? 2 : 0.8}
              />
              {/* Note label. We rotate the text so it sits radially upright
                  on the bottom half (inverted) and naturally on the top. */}
              <g transform={`translate(${labelX} ${labelY}) rotate(${center})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontFamily: 'Cinzel, Playfair Display, Georgia, serif',
                    fontWeight: 700,
                    fontSize: 22,
                    fill: active ? '#fef3c7' : '#1c1917',
                    pointerEvents: 'none',
                  }}
                >
                  {note.replace('#', '♯')}
                </text>
                {isSharp && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={18}
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      fill: active ? '#fef3c7' : '#3f2305',
                      pointerEvents: 'none',
                    }}
                  >
                    ♯ / ♭
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* Curved branding. */}
        <text style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.18em', fill: '#1c1917' }}>
          <textPath href="#pp-arc-top" startOffset="50%" textAnchor="middle">GLEEWORLD</textPath>
        </text>
        <text style={{ fontFamily: 'Cinzel, serif', fontWeight: 600, fontSize: 11, letterSpacing: '0.22em', fill: '#1c1917' }}>
          <textPath href="#pp-arc-bottom" startOffset="50%" textAnchor="middle">PITCH PIPE</textPath>
        </text>

        {/* Center hub + bolt. */}
        <circle cx={CX} cy={CY} r={R_HUB} fill="url(#pp-hub)" stroke="#7c2d12" strokeWidth={1.5} />
        <circle cx={CX} cy={CY} r={R_HUB_BOLT} fill="url(#pp-bolt)" stroke="#451a03" strokeWidth={1} />
        {/* Hex-bolt facets — 6 short segments inside the bolt. */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a1 = polar(CX, CY, R_HUB_BOLT * 0.55, i * 60);
          const a2 = polar(CX, CY, R_HUB_BOLT * 0.55, (i + 1) * 60);
          return (
            <line
              key={i}
              x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y}
              stroke="#451a03" strokeWidth={1.2}
            />
          );
        })}

        {/* Active-note glow ring — only visible when a pitch is sounding. */}
        {sounding && (
          <circle
            cx={CX} cy={CY} r={R_RIM_INNER - 2}
            fill="none"
            stroke="#fef3c7"
            strokeWidth={1.5}
            opacity={0.5}
          />
        )}
      </svg>

    </div>
  );
}
