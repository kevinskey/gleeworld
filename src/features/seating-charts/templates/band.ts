// Band templates.
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
function conductor() {
  return obj({
    object_type: 'label', subtype: 'conductor', x: W / 2 - 40, y: H - 140, width: 80, height: 24,
    label: 'Conductor', style: { fill: '#111827', color: '#fff', fontWeight: 700 }, z_index: 5, locked: true,
  });
}
function audience() {
  return obj({
    object_type: 'label', subtype: 'audience', x: W / 2 - 60, y: H - 40, width: 120, height: 20,
    label: 'Audience', style: { fill: 'transparent', color: '#64748b' }, z_index: 1, locked: true,
  });
}

function chairArc(rowIndex: number, rowSize: number, rowY: number, sections: string[]) {
  const pts = arcPoints(W / 2, rowY + 400, 420 - rowIndex * 40, rowSize, 140);
  const perSection = Math.ceil(rowSize / sections.length);
  return pts.map((p, i) => {
    const sec = sections[Math.min(sections.length - 1, Math.floor(i / perSection))];
    return obj({
      object_type: 'chair', subtype: 'band',
      x: p.x - 22, y: p.y - 22, width: 44, height: 44,
      label: `${rowIndex + 1}·${i + 1}`,
      style: {
        fill: (SECTION_COLORS as Record<string, string>)[sec] ?? SECTION_COLORS.neutral,
        stroke: '#0f172a', strokeWidth: 1, radius: 22,
      },
      properties: { row: rowIndex + 1, position: i + 1, section: sec },
    });
  });
}

// 10. Concert Band
function concertBand(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), conductor(), audience()];
  objects.push(...chairArc(0, 12, 160, ['flute', 'oboe', 'clarinet', 'bassoon']));
  objects.push(...chairArc(1, 14, 260, ['clarinet', 'saxophone']));
  objects.push(...chairArc(2, 12, 360, ['horn', 'trumpet', 'trombone']));
  objects.push(...chairArc(3, 8, 460, ['tuba']));
  objects.push(
    obj({ object_type: 'instrument', subtype: 'timpani', x: 220, y: 120, width: 100, height: 100, label: 'Timpani', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'mallets', x: W - 320, y: 120, width: 140, height: 60, label: 'Mallets', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 11. Wind Ensemble
function windEnsemble(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), conductor(), audience()];
  objects.push(...chairArc(0, 10, 180, ['flute', 'oboe']));
  objects.push(...chairArc(1, 12, 280, ['clarinet', 'bassoon']));
  objects.push(...chairArc(2, 10, 380, ['saxophone', 'horn']));
  objects.push(...chairArc(3, 10, 480, ['trumpet', 'trombone', 'tuba']));
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 12. Jazz Big Band (5-4-4-rhythm)
function jazzBigBand(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), conductor(), audience()];
  const sections = [
    { y: 240, count: 5, sec: 'saxophone', label: 'Sax' },
    { y: 340, count: 4, sec: 'trombone', label: 'Bones' },
    { y: 200, count: 4, sec: 'trumpet', label: 'Tpt' },
  ];
  sections.forEach((s, r) => {
    for (let i = 0; i < s.count; i++) {
      objects.push(
        obj({
          object_type: 'chair', subtype: 'jazz',
          x: 260 + i * 100, y: s.y,
          label: `${s.label} ${i + 1}`,
          style: { fill: SECTION_COLORS[s.sec as keyof typeof SECTION_COLORS], radius: 22, stroke: '#0f172a', strokeWidth: 1 },
          properties: { section: s.sec, chair: i + 1, row: r + 1 },
        }),
      );
    }
  });
  objects.push(
    obj({ object_type: 'instrument', subtype: 'drums', x: W - 340, y: 460, width: 120, height: 120, label: 'Drums', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'piano', x: 180, y: 460, width: 160, height: 80, label: 'Piano', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'bass', x: 380, y: 460, width: 60, height: 100, label: 'Bass', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'guitar', x: 480, y: 480, width: 100, height: 60, label: 'Guitar', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 13. Jazz Combo — 5-piece
function jazzCombo(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const pieces = [
    { label: 'Piano',   sub: 'piano',   x: W / 2 - 400, y: H / 2, w: 160, h: 80 },
    { label: 'Bass',    sub: 'bass',    x: W / 2 - 200, y: H / 2, w: 60, h: 100 },
    { label: 'Drums',   sub: 'drums',   x: W / 2 + 80,  y: H / 2, w: 120, h: 120 },
    { label: 'Sax',     sub: 'sax',     x: W / 2 - 40,  y: H / 2 + 20, w: 60, h: 60 },
    { label: 'Trumpet', sub: 'trumpet', x: W / 2 + 260, y: H / 2 + 20, w: 60, h: 60 },
  ];
  pieces.forEach((p) => objects.push(
    obj({ object_type: 'instrument', subtype: p.sub, x: p.x, y: p.y, width: p.w, height: p.h, label: p.label, style: { fill: '#111827', color: '#fff', radius: 8 } }),
  ));
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 14. Marching Band Static Formation — 8×8 grid
function marchingStatic(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      objects.push(
        obj({
          object_type: 'chair', subtype: 'marching',
          x: 200 + c * 100, y: 120 + r * 70, width: 40, height: 40,
          label: `${r + 1}·${c + 1}`,
          style: { fill: SECTION_COLORS.neutral, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, col: c + 1 },
        }),
      );
    }
  }
  objects.push(
    obj({ object_type: 'label', subtype: 'yardline', x: W / 2 - 60, y: H - 60, width: 120, height: 20, label: '50 yard line', style: { color: '#64748b', fill: 'transparent' }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 15. Percussion Ensemble
function percussionEnsemble(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const stations = [
    { label: 'Marimba', x: 240, y: 240, w: 200, h: 60 },
    { label: 'Vibraphone', x: 240, y: 340, w: 180, h: 60 },
    { label: 'Timpani', x: 500, y: 240, w: 180, h: 100 },
    { label: 'Snare', x: 500, y: 380, w: 80, h: 80 },
    { label: 'Bass Drum', x: 620, y: 380, w: 100, h: 100 },
    { label: 'Cymbals', x: 780, y: 260, w: 80, h: 80 },
    { label: 'Aux Perc', x: 900, y: 260, w: 200, h: 80 },
    { label: 'Xylophone', x: 900, y: 380, w: 200, h: 60 },
  ];
  stations.forEach((s) => objects.push(
    obj({ object_type: 'instrument', subtype: 'perc', x: s.x, y: s.y, width: s.w, height: s.h, label: s.label, style: { fill: '#111827', color: '#fff', radius: 6 } }),
  ));
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const BAND_TEMPLATES: TemplateEntry[] = [
  { key: 'band_concert', name: 'Concert Band', category: 'band',
    description: 'Standard concert-band arc with 4 rows.', generate: concertBand },
  { key: 'band_wind_ensemble', name: 'Wind Ensemble', category: 'band',
    description: 'Chamber-sized wind ensemble in curved rows.', generate: windEnsemble },
  { key: 'band_jazz_big', name: 'Jazz Big Band', category: 'band',
    description: '5-4-4 sax/bones/trumpets + rhythm section.', generate: jazzBigBand },
  { key: 'band_jazz_combo', name: 'Jazz Combo', category: 'band',
    description: '5-piece combo layout.', generate: jazzCombo },
  { key: 'band_marching_static', name: 'Marching Band (Static)', category: 'band',
    description: '8×8 static field grid with yard line.', generate: marchingStatic },
  { key: 'band_percussion', name: 'Percussion Ensemble', category: 'band',
    description: 'Mallets, timpani, drums, and aux stations.', generate: percussionEnsemble },
];
