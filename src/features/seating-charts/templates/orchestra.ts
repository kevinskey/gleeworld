// Orchestra templates.
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

interface StringWedge { section: string; label: string; angle: number; count: number; }

function wedgeChairs(cx: number, cy: number, radius: number, wedges: StringWedge[]) {
  const out: TemplateSpec['objects'] = [];
  wedges.forEach((w) => {
    const spread = 30;
    const startAngle = w.angle - spread / 2;
    for (let i = 0; i < w.count; i++) {
      const angleDeg = startAngle + (i * spread) / Math.max(1, w.count - 1);
      const angleRad = (angleDeg * Math.PI) / 180;
      const r = radius + (i % 3) * 24;
      out.push(
        obj({
          object_type: 'chair', subtype: w.section,
          x: cx + r * Math.cos(angleRad) - 20,
          y: cy - r * Math.sin(angleRad) - 20,
          width: 40, height: 40,
          label: `${w.label} ${i + 1}`,
          style: { fill: (SECTION_COLORS as Record<string, string>)[w.section], radius: 20, stroke: '#0f172a', strokeWidth: 1 },
          properties: { section: w.section, chair: i + 1 },
        }),
      );
    }
  });
  return out;
}

// 16. Full Orchestra — American Seating
function orchestraAmerican(): TemplateSpec {
  const cx = W / 2;
  const cy = H - 100;
  const objects: TemplateSpec['objects'] = [stage(), conductor(), audience()];
  objects.push(
    ...wedgeChairs(cx, cy, 220, [
      { section: 'violin1', label: 'V1', angle: 155, count: 14 },
      { section: 'violin2', label: 'V2', angle: 115, count: 12 },
      { section: 'viola',   label: 'Va', angle: 75,  count: 10 },
      { section: 'cello',   label: 'Vc', angle: 35,  count: 10 },
    ]),
  );
  for (let i = 0; i < 6; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'bass_v', x: W - 320 + i * 60, y: 240, width: 40, height: 40,
        label: `Bass ${i + 1}`, style: { fill: SECTION_COLORS.bass_v, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'bass_v', chair: i + 1 } }),
    );
  }
  for (let i = 0; i < 8; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'ww', x: 500 + i * 55, y: 240, width: 40, height: 40,
        label: `WW ${i + 1}`, style: { fill: SECTION_COLORS.flute, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'woodwind', chair: i + 1 } }),
    );
  }
  for (let i = 0; i < 10; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'brass', x: 460 + i * 55, y: 160, width: 40, height: 40,
        label: `Br ${i + 1}`, style: { fill: SECTION_COLORS.trumpet, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'brass', chair: i + 1 } }),
    );
  }
  objects.push(
    obj({ object_type: 'instrument', subtype: 'timpani', x: 220, y: 120, width: 100, height: 100, label: 'Timpani', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'harp', x: 240, y: 260, width: 80, height: 80, label: 'Harp', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 17. Full Orchestra — Antiphonal / German
function orchestraGerman(): TemplateSpec {
  const spec = orchestraAmerican();
  spec.objects = spec.objects.map((o) => {
    if (o.subtype === 'violin2') {
      return { ...o, x: W - (Number(o.x) - 60) - Number(o.width), style: { ...(o.style ?? {}), fill: SECTION_COLORS.violin2 } };
    }
    return o;
  });
  return spec;
}

// 18. String Orchestra
function stringOrchestra(): TemplateSpec {
  const cx = W / 2;
  const cy = H - 100;
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
      style: { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 2 }, locked: true, z_index: 0 }),
    conductor(), audience(),
  ];
  objects.push(
    ...wedgeChairs(cx, cy, 220, [
      { section: 'violin1', label: 'V1', angle: 155, count: 10 },
      { section: 'violin2', label: 'V2', angle: 115, count: 8  },
      { section: 'viola',   label: 'Va', angle: 75,  count: 6  },
      { section: 'cello',   label: 'Vc', angle: 35,  count: 6  },
    ]),
  );
  for (let i = 0; i < 4; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'bass_v', x: W - 300 + i * 60, y: 260, width: 40, height: 40,
        label: `Bass ${i + 1}`, style: { fill: SECTION_COLORS.bass_v, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'bass_v', chair: i + 1 } }),
    );
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 19. Chamber Orchestra
function chamberOrchestra(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const pts = arcPoints(W / 2, 500, 380, 20, 160);
  const sections = ['violin1', 'violin1', 'violin2', 'violin2', 'viola', 'cello', 'bass_v'];
  pts.forEach((p, i) => {
    const sec = sections[Math.floor((i / pts.length) * sections.length)];
    objects.push(
      obj({ object_type: 'chair', subtype: sec, x: p.x - 22, y: p.y - 22, width: 44, height: 44,
        label: `${i + 1}`, style: { fill: (SECTION_COLORS as Record<string, string>)[sec], radius: 22, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: sec, position: i + 1 } }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 20. Pit Orchestra / Musical Theatre
function pitOrchestra(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
      style: { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 2 }, locked: true, z_index: 0 }),
  ];
  const rows = [
    { y: 200, sections: [{ label: 'V1', count: 4, color: SECTION_COLORS.violin1 }, { label: 'V2', count: 4, color: SECTION_COLORS.violin2 }] },
    { y: 280, sections: [{ label: 'Va', count: 3, color: SECTION_COLORS.viola }, { label: 'Vc', count: 3, color: SECTION_COLORS.cello }] },
    { y: 360, sections: [{ label: 'Ww', count: 5, color: SECTION_COLORS.flute }] },
    { y: 440, sections: [{ label: 'Br', count: 4, color: SECTION_COLORS.trumpet }] },
    { y: 520, sections: [{ label: 'Rhythm', count: 4, color: SECTION_COLORS.piano }, { label: 'Bass', count: 1, color: SECTION_COLORS.bass_v }] },
  ];
  rows.forEach((row) => {
    let x = 260;
    row.sections.forEach((s) => {
      for (let i = 0; i < s.count; i++) {
        objects.push(
          obj({ object_type: 'chair', subtype: 'pit', x, y: row.y, width: 44, height: 44,
            label: `${s.label} ${i + 1}`, style: { fill: s.color, radius: 22, stroke: '#0f172a', strokeWidth: 1 },
            properties: { section: s.label } }),
        );
        x += 60;
      }
      x += 20;
    });
  });
  objects.push(
    obj({ object_type: 'label', subtype: 'stage', x: W / 2 - 60, y: 100, width: 120, height: 20, label: 'Stage above', style: { color: '#64748b', fill: 'transparent' }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 21. Full Orchestra with Chorus — orchestra front, choir risers rear
function orchestraWithChorus(): TemplateSpec {
  const spec = orchestraAmerican();
  const objects = spec.objects;
  const parts = ['soprano', 'alto', 'tenor', 'bass'];
  for (let r = 0; r < 3; r++) {
    const pts = arcPoints(W / 2, 60 + r * 40 + 400, 460 - r * 20, 16, 150);
    pts.forEach((p, i) => {
      const sec = parts[Math.floor(i / 4)];
      objects.push(
        obj({
          object_type: 'riser_slot', subtype: 'choir',
          x: p.x - 20, y: 80 + r * 40 + (p.y - (60 + r * 40 + 400)) * 0.15,
          width: 36, height: 36,
          label: `C·${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 8, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, position: i + 1, section: sec, group: 'chorus' },
        }),
      );
    });
  }
  return spec;
}

// 22. Youth Orchestra — reduced strings + smaller brass/ww
function youthOrchestra(): TemplateSpec {
  const cx = W / 2;
  const cy = H - 100;
  const objects: TemplateSpec['objects'] = [stage(), conductor(), audience()];
  objects.push(
    ...wedgeChairs(cx, cy, 200, [
      { section: 'violin1', label: 'V1', angle: 155, count: 8 },
      { section: 'violin2', label: 'V2', angle: 115, count: 6 },
      { section: 'viola',   label: 'Va', angle: 75,  count: 4 },
      { section: 'cello',   label: 'Vc', angle: 35,  count: 4 },
    ]),
  );
  for (let i = 0; i < 3; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'bass_v', x: W - 260 + i * 60, y: 260, width: 40, height: 40,
        label: `Bass ${i + 1}`, style: { fill: SECTION_COLORS.bass_v, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'bass_v', chair: i + 1 } }),
    );
  }
  for (let i = 0; i < 6; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'ww', x: 520 + i * 55, y: 250, width: 40, height: 40,
        label: `WW ${i + 1}`, style: { fill: SECTION_COLORS.flute, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'woodwind', chair: i + 1 } }),
    );
  }
  for (let i = 0; i < 6; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'brass', x: 540 + i * 55, y: 170, width: 40, height: 40,
        label: `Br ${i + 1}`, style: { fill: SECTION_COLORS.trumpet, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'brass', chair: i + 1 } }),
    );
  }
  objects.push(
    obj({ object_type: 'instrument', subtype: 'timpani', x: 280, y: 150, width: 90, height: 90, label: 'Timpani', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 23. Opera Pit — narrow deep pit under the stage lip
function operaPit(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: 100, subtype: 'stage',
      style: { fill: '#f8fafc', stroke: '#111827', strokeWidth: 3 }, locked: true, z_index: 0 }),
    obj({ object_type: 'label', subtype: 'stage', x: W / 2 - 60, y: 90, width: 120, height: 20, label: 'STAGE',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'stage_boundary', x: 100, y: 200, width: W - 200, height: H - 320,
      subtype: 'pit',
      style: { fill: '#f1f5f9', stroke: '#0f172a', strokeWidth: 2 }, locked: true, z_index: 0 }),
    obj({ object_type: 'label', subtype: 'pit', x: 120, y: 230, width: 200, height: 20, label: 'Orchestra Pit',
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
  ];
  const layouts = [
    { y: 280, sec: 'violin1', label: 'V1', count: 6, color: SECTION_COLORS.violin1 },
    { y: 340, sec: 'violin2', label: 'V2', count: 5, color: SECTION_COLORS.violin2 },
    { y: 400, sec: 'viola',   label: 'Va', count: 4, color: SECTION_COLORS.viola },
    { y: 460, sec: 'cello',   label: 'Vc', count: 4, color: SECTION_COLORS.cello },
  ];
  layouts.forEach((l) => {
    for (let i = 0; i < l.count; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: l.sec, x: 160 + i * 70, y: l.y, width: 40, height: 40,
          label: `${l.label} ${i + 1}`, style: { fill: l.color, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
          properties: { section: l.sec, chair: i + 1 } }),
      );
    }
  });
  // Winds / brass on right side
  const rights = [
    { y: 280, count: 5, label: 'WW', color: SECTION_COLORS.flute },
    { y: 340, count: 4, label: 'Br', color: SECTION_COLORS.trumpet },
    { y: 400, count: 2, label: 'Bn', color: SECTION_COLORS.bassoon },
    { y: 460, count: 2, label: 'Bass', color: SECTION_COLORS.bass_v },
    { y: 520, count: 3, label: 'Perc', color: SECTION_COLORS.perc },
  ];
  rights.forEach((row) => {
    for (let i = 0; i < row.count; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'pit', x: W - 500 + i * 70, y: row.y, width: 40, height: 40,
          label: `${row.label} ${i + 1}`, style: { fill: row.color, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
          properties: { section: row.label.toLowerCase(), chair: i + 1 } }),
      );
    }
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 24. Pops Orchestra — orchestra + mics + soloist featured mid-stage
function popsOrchestra(): TemplateSpec {
  const spec = orchestraAmerican();
  spec.objects.push(
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 15, y: H - 220, width: 30, height: 30, label: 'Soloist',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'monitor', subtype: 'floor', x: W / 2 - 40, y: H - 180, width: 80, height: 30, label: 'Monitor',
      style: { fill: '#0f172a', color: '#fff' } }),
    obj({ object_type: 'microphone', subtype: 'strings', x: 260, y: 620, width: 20, height: 20, label: 'V1 Mic',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'microphone', subtype: 'strings', x: 460, y: 640, width: 20, height: 20, label: 'V2 Mic',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'microphone', subtype: 'strings', x: W - 460, y: 640, width: 20, height: 20, label: 'Vc Mic',
      style: { fill: '#f97316' } }),
    obj({ object_type: 'instrument', subtype: 'piano', x: 340, y: 480, width: 180, height: 90, label: 'Grand Piano',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return spec;
}

// 25. Baroque Orchestra — smaller strings + continuo (harpsichord + cello)
function baroqueOrchestra(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage(), audience()];
  const cx = W / 2;
  const cy = H - 140;
  objects.push(
    ...wedgeChairs(cx, cy, 200, [
      { section: 'violin1', label: 'V1', angle: 150, count: 6 },
      { section: 'violin2', label: 'V2', angle: 120, count: 5 },
      { section: 'viola',   label: 'Va', angle: 80,  count: 4 },
      { section: 'cello',   label: 'Vc', angle: 40,  count: 3 },
    ]),
  );
  objects.push(
    obj({ object_type: 'chair', subtype: 'bass_v', x: W - 300, y: 260, width: 40, height: 40, label: 'Bass',
      style: { fill: SECTION_COLORS.bass_v, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
      properties: { section: 'bass_v', chair: 1 } }),
    obj({ object_type: 'instrument', subtype: 'harpsichord', x: cx - 100, y: cy - 80, width: 200, height: 90,
      label: 'Harpsichord (continuo)', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'chair', subtype: 'continuo', x: cx + 60, y: cy - 40, width: 40, height: 40, label: 'Continuo Vc',
      style: { fill: SECTION_COLORS.cello, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
      properties: { section: 'continuo', chair: 1 } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 26. Film-scoring session — divided strings + click booth
function filmScoring(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stage()];
  // Isolation booths for winds
  const booths = [
    { label: 'Woodwinds booth', x: 100, y: 120, w: 260, h: 160 },
    { label: 'Brass booth',    x: 100, y: 320, w: 260, h: 160 },
    { label: 'Percussion booth', x: 100, y: 520, w: 260, h: 160 },
    { label: 'Control room',   x: W - 340, y: 120, w: 260, h: 200 },
  ];
  booths.forEach((b) => objects.push(
    obj({ object_type: 'stage_boundary', subtype: 'booth', x: b.x, y: b.y, width: b.w, height: b.h,
      style: { fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 2, radius: 8 }, locked: true, z_index: 0 }),
    obj({ object_type: 'label', subtype: 'booth', x: b.x + 10, y: b.y + 10, width: b.w - 20, height: 18, label: b.label,
      style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
  ));
  // Strings in main room
  const sections = [
    { sec: 'violin1', label: 'V1', count: 8, y: 200 },
    { sec: 'violin2', label: 'V2', count: 6, y: 280 },
    { sec: 'viola',   label: 'Va', count: 4, y: 360 },
    { sec: 'cello',   label: 'Vc', count: 4, y: 440 },
    { sec: 'bass_v',  label: 'Bs', count: 2, y: 520 },
  ];
  sections.forEach((s) => {
    for (let i = 0; i < s.count; i++) {
      objects.push(
        obj({ object_type: 'chair', subtype: s.sec, x: 420 + i * 60, y: s.y, width: 40, height: 40, label: `${s.label} ${i + 1}`,
          style: { fill: (SECTION_COLORS as Record<string, string>)[s.sec], radius: 20, stroke: '#0f172a', strokeWidth: 1 },
          properties: { section: s.sec, chair: i + 1 } }),
        obj({ object_type: 'microphone', subtype: 'strings', x: 432 + i * 60, y: s.y + 44, width: 16, height: 16, label: '',
          style: { fill: '#f97316' } }),
      );
    }
  });
  objects.push(
    obj({ object_type: 'label', subtype: 'conductor', x: W / 2 - 60, y: H - 100, width: 120, height: 24,
      label: 'Conductor / Click', style: { fill: '#111827', color: '#fff', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'stage_plot', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const ORCHESTRA_TEMPLATES: TemplateEntry[] = [
  { key: 'orch_full_american', name: 'Full Orchestra (American)', category: 'orchestra',
    description: 'Violins left, celli/bass right — standard US layout.', generate: orchestraAmerican },
  { key: 'orch_full_german',   name: 'Full Orchestra (Antiphonal/German)', category: 'orchestra',
    description: 'Violin 2s on the outside right (Klemperer-style).', generate: orchestraGerman },
  { key: 'orch_strings', name: 'String Orchestra', category: 'orchestra',
    description: 'Strings-only chamber configuration.', generate: stringOrchestra },
  { key: 'orch_chamber', name: 'Chamber Orchestra', category: 'orchestra',
    description: '20-piece chamber arc.', generate: chamberOrchestra },
  { key: 'orch_pit',    name: 'Pit Orchestra', category: 'orchestra',
    description: 'Musical-theatre pit layered by section.', generate: pitOrchestra },
  { key: 'orch_with_chorus', name: 'Orchestra + Chorus', category: 'orchestra',
    description: 'Full orchestra with SATB chorus risers on the back of the stage.', generate: orchestraWithChorus },
  { key: 'orch_youth', name: 'Youth Orchestra', category: 'orchestra',
    description: 'Reduced strings and winds sized for school ensembles.', generate: youthOrchestra },
  { key: 'orch_opera_pit', name: 'Opera Pit', category: 'orchestra',
    description: 'Narrow, deep pit under the stage lip for opera productions.', generate: operaPit },
  { key: 'orch_pops', name: 'Pops Orchestra + Mics', category: 'orchestra',
    description: 'Amplified pops orchestra with soloist mic, monitor, and section mics.', generate: popsOrchestra },
  { key: 'orch_baroque', name: 'Baroque Orchestra + Continuo', category: 'orchestra',
    description: 'Small strings with harpsichord + continuo cello at center.', generate: baroqueOrchestra },
  { key: 'orch_film_scoring', name: 'Film Scoring Session', category: 'orchestra',
    description: 'Isolation booths + spot-mic\'d strings for scoring stage recording.', generate: filmScoring },
];
