// Dedicated stage-plot templates — the equipment-list PDF exporter targets
// this chart_mode ('stage_plot') to emit an equipment page.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { obj } from './utils';

const W = 1400;
const H = 800;

function stageBox(subtype = 'stage') {
  return obj({
    object_type: 'stage_boundary', subtype, x: 60, y: 60, width: W - 120, height: H - 200,
    style: { fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 3 }, locked: true, z_index: 0,
  });
}

function directionalLabels(): TemplateSpec['objects'] {
  return [
    obj({ object_type: 'label', subtype: 'us', x: W / 2 - 60, y: 90, width: 120, height: 20, label: 'Upstage',
      style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'ds', x: W / 2 - 60, y: H - 240, width: 120, height: 20, label: 'Downstage',
      style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'sl', x: 80, y: H / 2, width: 100, height: 20, label: 'Stage Left',
      style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'sr', x: W - 180, y: H / 2, width: 100, height: 20, label: 'Stage Right',
      style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'audience', x: W / 2 - 60, y: H - 100, width: 120, height: 30, label: 'AUDIENCE ▲',
      style: { fill: '#111827', color: '#fff', fontWeight: 700 }, locked: true }),
  ];
}

// 1. Rock Band Stage Plot — 4-piece with monitor mix
function rockBandStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBox(), ...directionalLabels()];
  const pieces = [
    { label: 'Drum kit',       sub: 'drums',   type: 'instrument', x: W / 2 - 70,  y: 180, w: 140, h: 140 },
    { label: 'Bass rig',       sub: 'bass',    type: 'instrument', x: W - 380,     y: 380, w: 90,  h: 120 },
    { label: 'Lead gtr rig',   sub: 'guitar',  type: 'instrument', x: W - 260,     y: 400, w: 120, h: 80 },
    { label: 'Rhythm gtr rig', sub: 'guitar',  type: 'instrument', x: 260,         y: 400, w: 120, h: 80 },
    { label: 'Keys',           sub: 'keyboard',type: 'instrument', x: 400,         y: 400, w: 160, h: 80 },
    { label: 'Lead Vox',       sub: 'vocal',   type: 'microphone', x: W / 2 - 15,  y: 500, w: 30,  h: 30 },
    { label: 'BGV 1',          sub: 'vocal',   type: 'microphone', x: W / 2 - 200, y: 480, w: 30,  h: 30 },
    { label: 'BGV 2',          sub: 'vocal',   type: 'microphone', x: W / 2 + 170, y: 480, w: 30,  h: 30 },
    { label: 'Wedge 1',        sub: 'floor',   type: 'monitor',    x: W / 2 - 50,  y: 560, w: 100, h: 40 },
    { label: 'Wedge 2',        sub: 'floor',   type: 'monitor',    x: W / 2 - 230, y: 540, w: 100, h: 40 },
    { label: 'Wedge 3',        sub: 'floor',   type: 'monitor',    x: W / 2 + 140, y: 540, w: 100, h: 40 },
  ];
  pieces.forEach((p) => objects.push(obj({
    object_type: p.type as 'instrument' | 'microphone' | 'monitor',
    subtype: p.sub, x: p.x, y: p.y, width: p.w, height: p.h, label: p.label,
    style: p.type === 'microphone'
      ? { fill: '#f97316' }
      : p.type === 'monitor'
        ? { fill: '#0f172a', color: '#fff', radius: 4 }
        : { fill: '#111827', color: '#fff', radius: 6 },
  })));
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 2. Solo Artist + Backing Band — front-centre soloist with 4-piece backline
function soloArtistStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBox(), ...directionalLabels()];
  const pieces = [
    { label: 'Soloist',    sub: 'vocal', type: 'microphone', x: W / 2 - 15, y: 460, w: 30, h: 30 },
    { label: 'Acoustic',   sub: 'vocal', type: 'microphone', x: W / 2 - 60, y: 500, w: 20, h: 20 },
    { label: 'Wedge',      sub: 'floor', type: 'monitor',    x: W / 2 - 40, y: 540, w: 80, h: 30 },
    { label: 'Piano',      sub: 'piano', type: 'instrument', x: 260,        y: 220, w: 200, h: 100 },
    { label: 'Bass',       sub: 'bass',  type: 'instrument', x: 500,        y: 220, w: 60,  h: 100 },
    { label: 'Drums',      sub: 'drums', type: 'instrument', x: 600,        y: 200, w: 140, h: 140 },
    { label: 'Guitar',     sub: 'guitar',type: 'instrument', x: 780,        y: 240, w: 120, h: 60 },
    { label: 'Strings section', sub: 'strings', type: 'instrument', x: 940, y: 220, w: 260, h: 100 },
  ];
  pieces.forEach((p) => objects.push(obj({
    object_type: p.type as 'instrument' | 'microphone' | 'monitor',
    subtype: p.sub, x: p.x, y: p.y, width: p.w, height: p.h, label: p.label,
    style: p.type === 'microphone' ? { fill: '#f97316' }
      : p.type === 'monitor' ? { fill: '#0f172a', color: '#fff', radius: 4 }
      : { fill: '#111827', color: '#fff', radius: 6 },
  })));
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 3. Comedy Club Stage — spotlight, single mic + stool
function comedyClubStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: W / 2 - 260, y: 180, width: 520, height: 300,
      style: { fill: '#0f172a', stroke: '#f97316', strokeWidth: 3 }, locked: true, z_index: 0 }),
    ...directionalLabels(),
    obj({ object_type: 'label', subtype: 'brand', x: W / 2 - 60, y: 100, width: 120, height: 30, label: 'Comedy Club',
      style: { fill: 'transparent', color: '#f97316', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 15, y: 300, width: 30, height: 30, label: 'Mic',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'chair', subtype: 'stool', x: W / 2 + 60, y: 310, width: 40, height: 40, label: 'Stool',
      style: { fill: '#fef3c7', radius: 20, stroke: '#92400e', strokeWidth: 1 } }),
    obj({ object_type: 'table', subtype: 'water', x: W / 2 - 100, y: 380, width: 60, height: 40, label: 'Water',
      style: { fill: '#dbeafe', stroke: '#1d4ed8', strokeWidth: 1, radius: 4 } }),
    obj({ object_type: 'monitor', subtype: 'floor', x: W / 2 - 40, y: 420, width: 80, height: 30, label: 'Wedge',
      style: { fill: '#0f172a', color: '#fff' } }),
    obj({ object_type: 'label', subtype: 'spotlight', x: W / 2 - 60, y: 200, width: 120, height: 20, label: '★ Spotlight',
      style: { fill: 'transparent', color: '#f97316', fontWeight: 700 }, locked: true }),
  ];
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 4. TED-style Lecture Stage — presenter with slide screen + audience mics
function tedStyleStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBox('lecture'), ...directionalLabels()];
  objects.push(
    obj({ object_type: 'label', subtype: 'screen', x: W / 2 - 200, y: 130, width: 400, height: 40, label: 'Projector Screen',
      style: { fill: '#0f172a', color: '#fff', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'stage_boundary', subtype: 'stage_circle', x: W / 2 - 160, y: 300, width: 320, height: 160,
      style: { fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 3, radius: 8 }, locked: true }),
    obj({ object_type: 'label', subtype: 'brand', x: W / 2 - 40, y: 320, width: 80, height: 20, label: 'x',
      style: { fill: 'transparent', color: '#fff', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'microphone', subtype: 'lav', x: W / 2 - 15, y: 380, width: 30, height: 30, label: 'Lav Mic',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'monitor', subtype: 'confidence', x: W / 2 - 240, y: 500, width: 100, height: 40, label: 'Confidence',
      style: { fill: '#0f172a', color: '#fff' } }),
    obj({ object_type: 'monitor', subtype: 'confidence', x: W / 2 + 140, y: 500, width: 100, height: 40, label: 'Confidence',
      style: { fill: '#0f172a', color: '#fff' } }),
    obj({ object_type: 'microphone', subtype: 'aisle', x: 200, y: H - 200, width: 30, height: 30, label: 'Aisle mic',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'microphone', subtype: 'aisle', x: W - 240, y: H - 200, width: 30, height: 30, label: 'Aisle mic',
      style: { fill: '#f97316' } }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 5. Sanctuary Worship Stage — full worship band + choir riser + pulpit
function sanctuaryStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBox('sanctuary'), ...directionalLabels()];
  objects.push(
    // Choir loft
    obj({ object_type: 'stage_boundary', subtype: 'loft', x: 200, y: 130, width: W - 400, height: 120,
      style: { fill: '#fef3c7', stroke: '#92400e', strokeWidth: 2, radius: 8 }, locked: true }),
    obj({ object_type: 'label', subtype: 'loft', x: 220, y: 140, width: 140, height: 20, label: 'Choir loft',
      style: { fill: 'transparent', color: '#78350f', fontWeight: 700 }, locked: true }),
  );
  // Choir seats
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 14; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'choir_loft', x: 260 + i * 60, y: 170 + r * 40, width: 44, height: 32,
          label: `${r + 1}·${i + 1}`, style: { fill: '#e0e7ff', radius: 4, stroke: '#4338ca', strokeWidth: 1 } }),
      );
    }
  }
  // Worship band
  objects.push(
    obj({ object_type: 'instrument', subtype: 'drums', x: W - 340, y: 300, width: 140, height: 140, label: 'Drums',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'bass',  x: W - 460, y: 320, width: 60,  height: 100, label: 'Bass',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'guitar', x: W - 580, y: 340, width: 100, height: 60, label: 'Elec Gtr',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'keyboard', x: 300, y: 340, width: 160, height: 80, label: 'Keys',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'piano', x: 480, y: 340, width: 180, height: 90, label: 'Piano',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 15, y: 470, width: 30, height: 30, label: 'Worship Lead',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 120, y: 490, width: 20, height: 20, label: 'BGV',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 + 110, y: 490, width: 20, height: 20, label: 'BGV',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'table', subtype: 'pulpit', x: 200, y: 480, width: 120, height: 80, label: 'Pulpit',
      style: { fill: '#78350f', color: '#fff', radius: 4 } }),
    obj({ object_type: 'monitor', subtype: 'floor', x: W / 2 - 40, y: 540, width: 80, height: 30, label: 'Wedge',
      style: { fill: '#0f172a', color: '#fff' } }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 6. DJ Set Stage — booth + speakers + lighting truss
function djSetStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBox('club'), ...directionalLabels()];
  objects.push(
    obj({ object_type: 'table', subtype: 'dj_booth', x: W / 2 - 120, y: 260, width: 240, height: 100, label: 'DJ Booth',
      style: { fill: '#0f172a', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'cdj', x: W / 2 - 100, y: 280, width: 80, height: 60, label: 'CDJ-L',
      style: { fill: '#f97316', color: '#fff', radius: 4 } }),
    obj({ object_type: 'instrument', subtype: 'mixer', x: W / 2 - 20, y: 280, width: 40, height: 60, label: 'Mixer',
      style: { fill: '#0f172a', color: '#fff', radius: 4 } }),
    obj({ object_type: 'instrument', subtype: 'cdj', x: W / 2 + 20, y: 280, width: 80, height: 60, label: 'CDJ-R',
      style: { fill: '#f97316', color: '#fff', radius: 4 } }),
    obj({ object_type: 'monitor', subtype: 'wedge', x: W / 2 - 220, y: 380, width: 120, height: 40, label: 'DJ Wedge',
      style: { fill: '#0f172a', color: '#fff' } }),
    obj({ object_type: 'monitor', subtype: 'wedge', x: W / 2 + 100, y: 380, width: 120, height: 40, label: 'DJ Wedge',
      style: { fill: '#0f172a', color: '#fff' } }),
    obj({ object_type: 'instrument', subtype: 'pa', x: 200, y: 460, width: 100, height: 60, label: 'FoH L',
      style: { fill: '#111827', color: '#fff', radius: 6 } }),
    obj({ object_type: 'instrument', subtype: 'pa', x: W - 300, y: 460, width: 100, height: 60, label: 'FoH R',
      style: { fill: '#111827', color: '#fff', radius: 6 } }),
    obj({ object_type: 'instrument', subtype: 'sub', x: 200, y: 540, width: 100, height: 40, label: 'Sub L',
      style: { fill: '#111827', color: '#fff', radius: 6 } }),
    obj({ object_type: 'instrument', subtype: 'sub', x: W - 300, y: 540, width: 100, height: 40, label: 'Sub R',
      style: { fill: '#111827', color: '#fff', radius: 6 } }),
    obj({ object_type: 'label', subtype: 'truss', x: W / 2 - 200, y: 150, width: 400, height: 30, label: 'Lighting Truss',
      style: { fill: '#334155', color: '#fff', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 7. Festival Main Stage — full backline + wings + monitor world
function festivalStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBox('festival'), ...directionalLabels()];
  objects.push(
    // Drum riser
    obj({ object_type: 'stage_boundary', subtype: 'riser', x: W / 2 - 150, y: 200, width: 300, height: 160,
      style: { fill: '#f1f5f9', stroke: '#64748b', strokeWidth: 2, radius: 4 }, locked: true }),
    obj({ object_type: 'label', subtype: 'riser', x: W / 2 - 60, y: 210, width: 120, height: 20, label: 'Drum Riser',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'instrument', subtype: 'drums', x: W / 2 - 70, y: 240, width: 140, height: 100, label: 'Drum kit',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    // Bass world (stage left)
    obj({ object_type: 'instrument', subtype: 'bass_rig', x: 240, y: 380, width: 200, height: 100, label: 'Bass rig',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'monitor', subtype: 'wedge', x: 320, y: 500, width: 80, height: 30, label: 'Wedge — Bass',
      style: { fill: '#0f172a', color: '#fff' } }),
    // Guitar world (stage right)
    obj({ object_type: 'instrument', subtype: 'gtr_rig', x: W - 440, y: 380, width: 200, height: 100, label: 'Gtr rig',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'monitor', subtype: 'wedge', x: W - 360, y: 500, width: 80, height: 30, label: 'Wedge — Gtr',
      style: { fill: '#0f172a', color: '#fff' } }),
    // Vocals
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 15, y: 460, width: 30, height: 30, label: 'Lead Vox',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'monitor', subtype: 'wedge', x: W / 2 - 40, y: 500, width: 80, height: 30, label: 'Wedge — Lead',
      style: { fill: '#0f172a', color: '#fff' } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 200, y: 480, width: 20, height: 20, label: 'BGV',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 + 180, y: 480, width: 20, height: 20, label: 'BGV',
      style: { fill: '#f97316' } }),
    // Wings
    obj({ object_type: 'label', subtype: 'wing_sl', x: 120, y: 300, width: 100, height: 20, label: 'Wing SL',
      style: { fill: 'transparent', color: '#64748b' }, locked: true }),
    obj({ object_type: 'label', subtype: 'wing_sr', x: W - 220, y: 300, width: 100, height: 20, label: 'Wing SR',
      style: { fill: 'transparent', color: '#64748b' }, locked: true }),
    // Monitor console downstage right
    obj({ object_type: 'instrument', subtype: 'monitor_console', x: W - 200, y: H - 210, width: 120, height: 60,
      label: 'Mon board', style: { fill: '#111827', color: '#fff', radius: 4 } }),
    // In-ear tx
    obj({ object_type: 'instrument', subtype: 'iem', x: W - 320, y: 210, width: 100, height: 40, label: 'IEM tx rack',
      style: { fill: '#111827', color: '#fff', radius: 4 } }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const STAGE_PLOT_TEMPLATES: TemplateEntry[] = [
  { key: 'stage_rock_band', name: 'Rock Band Stage Plot', category: 'stage_plot',
    description: '4-piece rock band with backline, vocal mics, and monitor wedges.', generate: rockBandStagePlot },
  { key: 'stage_solo_artist', name: 'Solo Artist + Backing Band', category: 'stage_plot',
    description: 'Front-centre soloist with strings + rhythm backline.', generate: soloArtistStagePlot },
  { key: 'stage_comedy_club', name: 'Comedy Club Stage', category: 'stage_plot',
    description: 'Spotlit stage with mic, stool, water, and wedge.', generate: comedyClubStagePlot },
  { key: 'stage_ted_style', name: 'TED-Style Lecture Stage', category: 'stage_plot',
    description: 'Presenter with projector screen, lav mic, confidence monitors, and audience mics.', generate: tedStyleStagePlot },
  { key: 'stage_sanctuary', name: 'Sanctuary Worship Stage', category: 'stage_plot',
    description: 'Choir loft above worship band, pulpit stage-left.', generate: sanctuaryStagePlot },
  { key: 'stage_dj_set', name: 'DJ Set Stage', category: 'stage_plot',
    description: 'DJ booth + CDJs + FoH speakers + subs + lighting truss.', generate: djSetStagePlot },
  { key: 'stage_festival', name: 'Festival Main Stage', category: 'stage_plot',
    description: 'Full backline, drum riser, IEM rack, and monitor world for a headliner slot.', generate: festivalStagePlot },
];
