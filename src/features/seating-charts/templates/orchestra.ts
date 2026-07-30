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
  // Bass rear right
  for (let i = 0; i < 6; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'bass_v', x: W - 320 + i * 60, y: 240, width: 40, height: 40,
        label: `Bass ${i + 1}`, style: { fill: SECTION_COLORS.bass_v, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'bass_v', chair: i + 1 } }),
    );
  }
  // Woodwinds centre
  for (let i = 0; i < 8; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'ww', x: 500 + i * 55, y: 240, width: 40, height: 40,
        label: `WW ${i + 1}`, style: { fill: SECTION_COLORS.flute, radius: 20, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: 'woodwind', chair: i + 1 } }),
    );
  }
  // Brass rear centre
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
  // Swap Violin 2 to the outside right.
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
];
