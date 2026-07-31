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

// 16. Symphonic Band — bigger concert-band with extended winds + expanded percussion
function symphonicBand(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), conductor(), audience()];
  objects.push(...chairArc(0, 14, 150, ['flute', 'oboe', 'clarinet', 'bassoon']));
  objects.push(...chairArc(1, 16, 250, ['clarinet', 'saxophone']));
  objects.push(...chairArc(2, 14, 350, ['horn', 'trumpet', 'trombone']));
  objects.push(...chairArc(3, 10, 450, ['tuba', 'euphonium']));
  objects.push(
    obj({ object_type: 'instrument', subtype: 'timpani', x: 180, y: 120, width: 120, height: 120, label: 'Timpani', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'mallets', x: W - 340, y: 120, width: 200, height: 60, label: 'Mallet perc', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'aux_perc', x: W - 340, y: 200, width: 200, height: 60, label: 'Aux perc', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'piano', x: 320, y: 120, width: 160, height: 80, label: 'Piano', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 17. Brass Quintet — 2 tpt, hn, tbn, tuba
function brassQuintet(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const roles = [
    { label: 'Tpt 1', sec: 'trumpet' },
    { label: 'Tpt 2', sec: 'trumpet' },
    { label: 'Horn', sec: 'horn' },
    { label: 'Trombone', sec: 'trombone' },
    { label: 'Tuba', sec: 'tuba' },
  ];
  const pts = arcPoints(W / 2, 520, 320, roles.length, 140);
  pts.forEach((p, i) => {
    const r = roles[i];
    objects.push(
      obj({ object_type: 'chair', subtype: 'brass', x: p.x - 26, y: p.y - 26, width: 52, height: 52, label: r.label,
        style: { fill: SECTION_COLORS[r.sec as keyof typeof SECTION_COLORS], radius: 26, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: r.sec, position: i + 1 } }),
      obj({ object_type: 'music_stand', subtype: 'stand', x: p.x - 10, y: p.y - 60, width: 20, height: 20, label: '♪',
        style: { fill: '#64748b', color: '#fff' } }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 18. Woodwind Quintet — fl, ob, cl, bn, hn
function woodwindQuintet(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const roles = [
    { label: 'Flute', sec: 'flute' },
    { label: 'Oboe', sec: 'oboe' },
    { label: 'Clarinet', sec: 'clarinet' },
    { label: 'Bassoon', sec: 'bassoon' },
    { label: 'Horn', sec: 'horn' },
  ];
  const pts = arcPoints(W / 2, 520, 320, roles.length, 140);
  pts.forEach((p, i) => {
    const r = roles[i];
    objects.push(
      obj({ object_type: 'chair', subtype: 'woodwind', x: p.x - 26, y: p.y - 26, width: 52, height: 52, label: r.label,
        style: { fill: SECTION_COLORS[r.sec as keyof typeof SECTION_COLORS], radius: 26, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: r.sec, position: i + 1 } }),
      obj({ object_type: 'music_stand', subtype: 'stand', x: p.x - 10, y: p.y - 60, width: 20, height: 20, label: '♪',
        style: { fill: '#64748b', color: '#fff' } }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 19. Saxophone Quartet — SATB saxes
function saxophoneQuartet(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const roles = [
    { label: 'Soprano Sax', sec: 'saxophone' },
    { label: 'Alto Sax',    sec: 'saxophone' },
    { label: 'Tenor Sax',   sec: 'saxophone' },
    { label: 'Bari Sax',    sec: 'saxophone' },
  ];
  const pts = arcPoints(W / 2, 520, 280, roles.length, 120);
  pts.forEach((p, i) => {
    const r = roles[i];
    objects.push(
      obj({ object_type: 'chair', subtype: 'sax', x: p.x - 28, y: p.y - 28, width: 56, height: 56, label: r.label,
        style: { fill: SECTION_COLORS.saxophone, radius: 28, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'saxophone', position: i + 1 } }),
      obj({ object_type: 'music_stand', subtype: 'stand', x: p.x - 10, y: p.y - 70, width: 20, height: 20, label: '♪',
        style: { fill: '#64748b', color: '#fff' } }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 20. Drumline — battery + front ensemble (pit)
function drumline(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  const rows = [
    { label: 'Snare', y: 260, count: 5 },
    { label: 'Tenor', y: 340, count: 4 },
    { label: 'Bass',  y: 420, count: 5 },
    { label: 'Cymbals', y: 500, count: 4 },
  ];
  rows.forEach((row) => {
    for (let i = 0; i < row.count; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'drumline', x: 320 + i * 100, y: row.y, width: 60, height: 60,
          label: `${row.label} ${i + 1}`,
          style: { fill: SECTION_COLORS.perc, radius: 30, stroke: '#0f172a', strokeWidth: 1 },
          properties: { section: row.label.toLowerCase(), position: i + 1 } }),
      );
    }
  });
  // Front ensemble (pit) upstage row
  const pit = ['Marimba 1', 'Marimba 2', 'Vibes', 'Xylophone', 'Bells', 'Aux'];
  pit.forEach((label, i) => {
    objects.push(
      obj({ object_type: 'instrument', subtype: 'front_ensemble', x: 200 + i * 160, y: 130, width: 140, height: 60,
        label, style: { fill: '#111827', color: '#fff', radius: 6 } }),
    );
  });
  objects.push(
    obj({ object_type: 'label', subtype: 'group', x: 200, y: 100, width: 200, height: 20, label: 'Front ensemble (pit)',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'label', subtype: 'group', x: 260, y: 220, width: 160, height: 20, label: 'Battery',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 21. Marching Company Front — 60-across single line
function marchingCompanyFront(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  const perLine = 30;
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < perLine; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'marching', x: 100 + i * 40, y: 280 + r * 80, width: 30, height: 30,
          label: `${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS.neutral, radius: 15, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, position: i + 1 } }),
      );
    }
  }
  objects.push(
    obj({ object_type: 'label', subtype: 'yardline', x: W / 2 - 60, y: H - 60, width: 120, height: 20, label: '50 yard line',
      style: { color: '#64748b', fill: 'transparent' }, locked: true }),
    obj({ object_type: 'label', subtype: 'formation', x: W / 2 - 100, y: 200, width: 200, height: 20, label: 'Company Front',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 22. Marching Chevron / Wedge
function marchingChevron(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const count = r * 2 + 3;
    const startX = W / 2 - ((count - 1) * 60) / 2;
    for (let i = 0; i < count; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'marching', x: startX + i * 60, y: 160 + r * 70, width: 32, height: 32,
          label: `${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS.neutral, radius: 16, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, position: i + 1 } }),
      );
    }
  }
  objects.push(
    obj({ object_type: 'label', subtype: 'formation', x: W / 2 - 80, y: 100, width: 160, height: 20, label: 'Chevron / Wedge',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 23. Marching Block — 8×12 rank/file grid
function marchingBlock(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  const rows = 8;
  const cols = 12;
  const stepX = (W - 300) / (cols - 1);
  const stepY = (H - 300) / (rows - 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'marching', x: 150 + c * stepX, y: 150 + r * stepY, width: 28, height: 28,
          label: `${r + 1}·${c + 1}`,
          style: { fill: SECTION_COLORS.neutral, radius: 14, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, col: c + 1 } }),
      );
    }
  }
  objects.push(
    obj({ object_type: 'label', subtype: 'formation', x: W / 2 - 60, y: 100, width: 120, height: 20, label: 'Block',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const BAND_TEMPLATES: TemplateEntry[] = [
  { key: 'band_concert', name: 'Concert Band', category: 'band',
    description: 'Standard concert-band arc with 4 rows.', generate: concertBand },
  { key: 'band_wind_ensemble', name: 'Wind Ensemble', category: 'band',
    description: 'Chamber-sized wind ensemble in curved rows.', generate: windEnsemble },
  { key: 'band_symphonic', name: 'Symphonic Band', category: 'band',
    description: 'Larger concert band with extended winds + expanded percussion.', generate: symphonicBand },
  { key: 'band_jazz_big', name: 'Jazz Big Band', category: 'band',
    description: '5-4-4 sax/bones/trumpets + rhythm section.', generate: jazzBigBand },
  { key: 'band_jazz_combo', name: 'Jazz Combo', category: 'band',
    description: '5-piece combo layout.', generate: jazzCombo },
  { key: 'band_brass_quintet', name: 'Brass Quintet', category: 'band',
    description: '2 tpt · hn · tbn · tuba on a chamber arc.', generate: brassQuintet },
  { key: 'band_woodwind_quintet', name: 'Woodwind Quintet', category: 'band',
    description: 'Fl · Ob · Cl · Bn · Hn on a chamber arc.', generate: woodwindQuintet },
  { key: 'band_saxophone_quartet', name: 'Saxophone Quartet', category: 'band',
    description: 'SATB saxophone quartet with music stands.', generate: saxophoneQuartet },
  { key: 'band_drumline', name: 'Drumline + Front Ensemble', category: 'band',
    description: 'Snare/tenor/bass/cymbals battery plus front ensemble (pit).', generate: drumline },
  { key: 'band_marching_static', name: 'Marching Band (Static)', category: 'band',
    description: '8×8 static field grid with yard line.', generate: marchingStatic },
  { key: 'band_marching_company_front', name: 'Marching Company Front', category: 'band',
    description: '60-across single-line company-front formation.', generate: marchingCompanyFront },
  { key: 'band_marching_chevron', name: 'Marching Chevron / Wedge', category: 'band',
    description: 'Expanding V-formation for field-show impact moments.', generate: marchingChevron },
  { key: 'band_marching_block', name: 'Marching Block Formation', category: 'band',
    description: '8×12 marching block for parade or field openers.', generate: marchingBlock },
  { key: 'band_percussion', name: 'Percussion Ensemble', category: 'band',
    description: 'Mallets, timpani, drums, and aux stations.', generate: percussionEnsemble },
];
