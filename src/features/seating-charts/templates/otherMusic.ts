// "Other music ensembles" templates: bell choir, chamber, worship, stage plot.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { SECTION_COLORS, obj } from './utils';

const W = 1400;
const H = 800;

function stage() {
  return obj({
    object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
    z_index: 0, style: { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 2 }, locked: true,
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

// 24. General Stage Plot
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

export const OTHER_MUSIC_TEMPLATES: TemplateEntry[] = [
  { key: 'other_handbell', name: 'Handbell / Handchime Choir', category: 'other_music',
    description: 'Two-tier handbell tables with 12 positions each.', generate: handbell },
  { key: 'other_chamber_ensemble', name: 'Chamber Ensemble', category: 'other_music',
    description: '5-piece chamber layout with music stands.', generate: chamberEnsemble },
  { key: 'other_worship_band', name: 'Worship Band', category: 'other_music',
    description: 'Worship-team stage plot with vocals + rhythm.', generate: worshipBand },
  { key: 'other_general_stage_plot', name: 'General Stage Plot', category: 'stage_plot',
    description: 'Blank stage with directional markers.', generate: generalStagePlot },
];
