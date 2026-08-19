// "Other music ensembles" templates: bell choir, chamber, worship, mariachi,
// steel drum, gospel praise, bluegrass, rock band, Latin ensemble, drum circle,
// chamber winds.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { SECTION_COLORS, arcPoints, obj } from './utils';

const W = 1400;
const H = 800;

function stage() {
  return obj({
    object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
    z_index: 0, style: { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 2 }, locked: true,
  });
}

function audience() {
  return obj({
    object_type: 'label', subtype: 'audience', x: W / 2 - 60, y: H - 40, width: 120, height: 20,
    label: 'Audience', style: { fill: 'transparent', color: '#64748b' }, z_index: 1, locked: true,
  });
}

// 21. Handbell / Handchime Choir — two rows of tables with positions
function handbell(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  for (let r = 0; r < 2; r++) {
    objects.push(
      obj({ object_type: 'table', subtype: 'bell_table', x: 240, y: 220 + r * 160, width: W - 480, height: 60,
        label: r === 0 ? 'Handbell table (front)' : 'Handbell table (back)',
        style: { fill: '#fef3c7', stroke: '#92400e', strokeWidth: 2, radius: 4 } }),
    );
    for (let i = 0; i < 12; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'bells', x: 260 + i * 80, y: 290 + r * 160, width: 40, height: 40,
          label: `${r + 1}·${i + 1}`, style: { fill: SECTION_COLORS.neutral, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, position: i + 1 } }),
      );
    }
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 22. Chamber Ensemble (generic 4-6 people arc)
function chamberEnsemble(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  for (let i = 0; i < 5; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'chamber', x: 400 + i * 130, y: H / 2, width: 60, height: 60,
        label: `Player ${i + 1}`, style: { fill: SECTION_COLORS.neutral, radius: 30, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1 } }),
      obj({ object_type: 'music_stand', subtype: 'stand', x: 420 + i * 130, y: H / 2 - 40, width: 20, height: 20,
        label: '♪', style: { fill: '#64748b' } }),
    );
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 23. Worship Band
function worshipBand(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  const pieces = [
    { label: 'Drums',    sub: 'drums',    x: W - 340, y: 240, w: 140, h: 140 },
    { label: 'Bass',     sub: 'bass',     x: W - 500, y: 260, w: 60,  h: 100 },
    { label: 'Elec Gtr', sub: 'guitar',   x: W - 620, y: 280, w: 100, h: 60  },
    { label: 'Acoustic', sub: 'guitar',   x: W - 760, y: 280, w: 100, h: 60  },
    { label: 'Keys',     sub: 'keyboard', x: W - 900, y: 260, w: 160, h: 80  },
    { label: 'Lead Vox', sub: 'mic',      x: 460,     y: 460, w: 30,  h: 30  },
    { label: 'BGV 1',    sub: 'mic',      x: 380,     y: 500, w: 30,  h: 30  },
    { label: 'BGV 2',    sub: 'mic',      x: 540,     y: 500, w: 30,  h: 30  },
  ];
  pieces.forEach((p) => objects.push(
    p.sub === 'mic'
      ? obj({ object_type: 'microphone', subtype: 'vocal', x: p.x, y: p.y, width: p.w, height: p.h, label: p.label, style: { fill: '#f97316' } })
      : obj({ object_type: 'instrument', subtype: p.sub, x: p.x, y: p.y, width: p.w, height: p.h, label: p.label, style: { fill: '#111827', color: '#fff', radius: 8 } }),
  ));
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 24. General Stage Plot (kept in "stage_plot" category)
function generalStagePlot(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 200,
      style: { fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 3 }, locked: true, z_index: 0 }),
    obj({ object_type: 'label', subtype: 'us', x: W / 2 - 60, y: 90, width: 120, height: 20, label: 'Upstage', style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'ds', x: W / 2 - 60, y: H - 220, width: 120, height: 20, label: 'Downstage', style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'sl', x: 80, y: H / 2, width: 100, height: 20, label: 'Stage Left', style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'sr', x: W - 180, y: H / 2, width: 100, height: 20, label: 'Stage Right', style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'audience', x: W / 2 - 60, y: H - 100, width: 120, height: 30, label: 'AUDIENCE ▲', style: { fill: '#111827', color: '#fff', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 15, y: H / 2, width: 30, height: 30, label: 'Vocal', style: { fill: '#f97316' } }),
    obj({ object_type: 'monitor', subtype: 'floor', x: W / 2 - 40, y: H / 2 + 80, width: 80, height: 30, label: 'Monitor', style: { fill: '#0f172a', color: '#fff' } }),
  ];
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 25. Mariachi Ensemble — front line vocalists, back line guitarron / vihuela
function mariachi(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  // Front line (violins + vocals)
  const front = [
    { label: 'Violin 1', sec: 'violin1' },
    { label: 'Violin 2', sec: 'violin2' },
    { label: 'Trumpet 1', sec: 'trumpet' },
    { label: 'Trumpet 2', sec: 'trumpet' },
    { label: 'Violin 3', sec: 'violin1' },
    { label: 'Violin 4', sec: 'violin2' },
  ];
  const pts = arcPoints(W / 2, 560, 320, front.length, 140);
  pts.forEach((p, i) => {
    const f = front[i];
    objects.push(
      obj({ object_type: 'chair', subtype: 'mariachi', x: p.x - 26, y: p.y - 26, width: 52, height: 52, label: f.label,
        style: { fill: SECTION_COLORS[f.sec as keyof typeof SECTION_COLORS], radius: 26, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: f.sec, position: i + 1 } }),
      obj({ object_type: 'microphone', subtype: 'vocal', x: p.x - 8, y: p.y + 40, width: 16, height: 16, style: { fill: '#f97316' } }),
    );
  });
  // Back rhythm line
  const back = [
    { label: 'Vihuela',    sec: 'guitar' },
    { label: 'Guitarra',   sec: 'guitar' },
    { label: 'Guitarrón',  sec: 'bass' },
    { label: 'Arpa',       sec: 'harp' },
  ];
  back.forEach((b, i) => objects.push(
    obj({ object_type: 'chair', subtype: 'rhythm', x: 400 + i * 160, y: 260, width: 52, height: 52, label: b.label,
      style: { fill: SECTION_COLORS[b.sec as keyof typeof SECTION_COLORS] ?? SECTION_COLORS.neutral, radius: 26, stroke: '#0f172a', strokeWidth: 1 },
      properties: { section: b.sec, position: i + 1 } }),
  ));
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 26. Steel Drum Band — front (leads), middle (guitars/cellos), back (basses + kit)
function steelDrumBand(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const rows = [
    { label: 'Lead', y: 500, count: 4 },
    { label: 'Double Second', y: 400, count: 3 },
    { label: 'Guitar Pan', y: 300, count: 2 },
    { label: 'Bass Pan', y: 220, count: 3 },
  ];
  rows.forEach((row) => {
    for (let i = 0; i < row.count; i++) {
      objects.push(
        obj({ object_type: 'instrument', subtype: 'steel_pan', x: 320 + i * 180, y: row.y, width: 140, height: 60,
          label: `${row.label} ${i + 1}`, style: { fill: '#111827', color: '#fff', radius: 6 } }),
      );
    }
  });
  objects.push(
    obj({ object_type: 'instrument', subtype: 'drum_kit', x: W - 260, y: 200, width: 120, height: 120, label: 'Drum kit',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'perc', x: W - 260, y: 340, width: 120, height: 80, label: 'Iron / cowbell',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 27. Gospel Praise Team — 4-6 vocals on individual mics, rhythm section behind
function gospelPraiseTeam(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const vocalists = ['Lead', 'BGV 1', 'BGV 2', 'BGV 3', 'BGV 4'];
  vocalists.forEach((v, i) => objects.push(
    obj({ object_type: 'chair', subtype: 'vocal', x: 340 + i * 140, y: 500, width: 52, height: 52, label: v,
      style: { fill: SECTION_COLORS.soprano, radius: 26, stroke: '#0f172a', strokeWidth: 1 },
      properties: { section: 'praise', position: i + 1 } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: 360 + i * 140, y: 560, width: 16, height: 16, style: { fill: '#f97316' } }),
  ));
  objects.push(
    obj({ object_type: 'instrument', subtype: 'drums', x: 200, y: 200, width: 120, height: 120, label: 'Drums', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'organ', x: 360, y: 220, width: 140, height: 80, label: 'Organ', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'piano', x: 520, y: 220, width: 140, height: 80, label: 'Piano', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'bass', x: 700, y: 220, width: 60, height: 100, label: 'Bass', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'guitar', x: 800, y: 240, width: 100, height: 60, label: 'Guitar', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 28. Bluegrass Band — 5 players on a single arc around a central mic
function bluegrass(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const roles = ['Fiddle', 'Mandolin', 'Guitar', 'Banjo', 'Bass'];
  const pts = arcPoints(W / 2, 500, 280, roles.length, 120);
  pts.forEach((p, i) => {
    objects.push(
      obj({ object_type: 'chair', subtype: 'bluegrass', x: p.x - 28, y: p.y - 28, width: 56, height: 56, label: roles[i],
        style: { fill: SECTION_COLORS.neutral, radius: 28, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1 } }),
    );
  });
  objects.push(
    obj({ object_type: 'microphone', subtype: 'condenser', x: W / 2 - 15, y: 460, width: 30, height: 30, label: 'Center Mic',
      style: { fill: '#f97316' } }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 29. Rock Band 4-piece — guitar / bass / drums / vocals
function rockBand(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const pieces = [
    { label: 'Drums',   sub: 'drums',  x: W / 2 - 60,  y: 200, w: 140, h: 140 },
    { label: 'Bass',    sub: 'bass',   x: W - 380,     y: 460, w: 60,  h: 100 },
    { label: 'Lead Gtr', sub: 'guitar', x: W - 260,    y: 480, w: 100, h: 60 },
    { label: 'Rhythm Gtr', sub: 'guitar', x: 320,      y: 480, w: 100, h: 60 },
    { label: 'Keys',    sub: 'keyboard', x: 460,       y: 460, w: 160, h: 80 },
  ];
  pieces.forEach((p) => objects.push(
    obj({ object_type: 'instrument', subtype: p.sub, x: p.x, y: p.y, width: p.w, height: p.h, label: p.label, style: { fill: '#111827', color: '#fff', radius: 8 } }),
  ));
  objects.push(
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 15, y: 620, width: 30, height: 30, label: 'Lead Vox',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'monitor', subtype: 'floor', x: W / 2 - 40, y: 670, width: 80, height: 30, label: 'Wedge',
      style: { fill: '#0f172a', color: '#fff' } }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 30. Latin Ensemble — percussion-heavy, horns, piano, bass
function latinEnsemble(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const pieces = [
    { label: 'Timbales', sub: 'perc',   x: 280, y: 220, w: 120, h: 60 },
    { label: 'Congas',   sub: 'perc',   x: 420, y: 220, w: 100, h: 100 },
    { label: 'Bongos',   sub: 'perc',   x: 540, y: 240, w: 80,  h: 60 },
    { label: 'Piano',    sub: 'piano',  x: 660, y: 240, w: 160, h: 80 },
    { label: 'Bass',     sub: 'bass',   x: 860, y: 240, w: 60,  h: 100 },
    { label: 'Trombone', sub: 'brass',  x: 960, y: 260, w: 60,  h: 60 },
    { label: 'Trumpet',  sub: 'brass',  x: 1040, y: 260, w: 60, h: 60 },
    { label: 'Sax',      sub: 'sax',    x: 1120, y: 260, w: 60, h: 60 },
  ];
  pieces.forEach((p) => objects.push(
    obj({ object_type: 'instrument', subtype: p.sub, x: p.x, y: p.y, width: p.w, height: p.h, label: p.label, style: { fill: '#111827', color: '#fff', radius: 8 } }),
  ));
  // Vocalists downstage
  ['Lead Vox', 'Coro 1', 'Coro 2'].forEach((v, i) => objects.push(
    obj({ object_type: 'microphone', subtype: 'vocal', x: 500 + i * 120, y: 520, width: 30, height: 30, label: v,
      style: { fill: '#f97316' } }),
  ));
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 31. Drum Circle / West-African Ensemble — ring of drums with a lead djembe center
function drumCircle(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const cx = W / 2;
  const cy = H / 2 - 40;
  objects.push(
    obj({ object_type: 'instrument', subtype: 'lead_djembe', x: cx - 40, y: cy - 40, width: 80, height: 80,
      label: 'Lead Djembe', style: { fill: '#111827', color: '#fff', radius: 40 } }),
  );
  const n = 12;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + 300 * Math.cos(angle);
    const y = cy + 220 * Math.sin(angle);
    objects.push(
      obj({ object_type: 'chair', subtype: 'drummer', x: x - 26, y: y - 26, width: 52, height: 52,
        label: `Drum ${i + 1}`, style: { fill: SECTION_COLORS.perc, radius: 26, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1 } }),
    );
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 32. Chamber Winds — 10-piece harmoniemusik
function chamberWinds(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const roles = [
    { label: 'Oboe 1', sec: 'oboe' }, { label: 'Oboe 2', sec: 'oboe' },
    { label: 'Cl 1', sec: 'clarinet' }, { label: 'Cl 2', sec: 'clarinet' },
    { label: 'Bn 1', sec: 'bassoon' }, { label: 'Bn 2', sec: 'bassoon' },
    { label: 'Hn 1', sec: 'horn' }, { label: 'Hn 2', sec: 'horn' },
    { label: 'C.Bn', sec: 'bassoon' }, { label: 'Bass', sec: 'bass_v' },
  ];
  const pts = arcPoints(W / 2, 520, 340, roles.length, 150);
  pts.forEach((p, i) => {
    const r = roles[i];
    objects.push(
      obj({ object_type: 'chair', subtype: 'chamber_winds', x: p.x - 24, y: p.y - 24, width: 48, height: 48, label: r.label,
        style: { fill: SECTION_COLORS[r.sec as keyof typeof SECTION_COLORS], radius: 24, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: r.sec, position: i + 1 } }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const OTHER_MUSIC_TEMPLATES: TemplateEntry[] = [
  { key: 'other_handbell', name: 'Handbell / Handchime Choir', category: 'other_music',
    description: 'Two-tier handbell tables with 12 positions each.', generate: handbell },
  { key: 'other_chamber_ensemble', name: 'Chamber Ensemble', category: 'other_music',
    description: '5-piece chamber layout with music stands.', generate: chamberEnsemble },
  { key: 'other_worship_band', name: 'Worship Band', category: 'other_music',
    description: 'Worship-team stage plot with vocals + rhythm.', generate: worshipBand },
  { key: 'other_general_stage_plot', name: 'General Stage Plot', category: 'stage_plot',
    description: 'Blank stage with directional markers.', generate: generalStagePlot },
  { key: 'other_mariachi', name: 'Mariachi Ensemble', category: 'other_music',
    description: 'Front-line violins + trumpets, back-line vihuela / guitarrón / harp.', generate: mariachi },
  { key: 'other_steel_drum', name: 'Steel Drum Band', category: 'other_music',
    description: 'Lead / seconds / guitar pan / bass pan + drum kit + iron.', generate: steelDrumBand },
  { key: 'other_gospel_praise', name: 'Gospel Praise Team', category: 'other_music',
    description: 'Lead + BGV vocalists on individual mics with rhythm section behind.', generate: gospelPraiseTeam },
  { key: 'other_bluegrass', name: 'Bluegrass Band', category: 'other_music',
    description: '5-piece bluegrass band around a single condenser mic.', generate: bluegrass },
  { key: 'other_rock_band', name: 'Rock Band (5-piece)', category: 'other_music',
    description: 'Guitar / bass / drums / keys / lead vocals stage plot.', generate: rockBand },
  { key: 'other_latin', name: 'Latin Ensemble (Salsa)', category: 'other_music',
    description: 'Percussion-heavy salsa band with horns and lead + coro vocals.', generate: latinEnsemble },
  { key: 'other_drum_circle', name: 'Drum Circle / West-African', category: 'other_music',
    description: '12 drummers ringed around a lead djembe.', generate: drumCircle },
  { key: 'other_chamber_winds', name: 'Chamber Winds (10-piece)', category: 'other_music',
    description: 'Harmoniemusik: pairs of Ob/Cl/Bn/Hn plus contrabassoon and bass.', generate: chamberWinds },
];
