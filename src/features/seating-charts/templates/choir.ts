// Choir templates. All 9 catalog entries live in this file so section-color
// choices stay consistent across variants.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { SECTION_COLORS, arcPoints, obj } from './utils';

const W = 1400;
const H = 800;
const STAGE_MARGIN = 60;

function stageBoundary() {
  return obj({
    object_type: 'stage_boundary',
    x: STAGE_MARGIN,
    y: STAGE_MARGIN,
    width: W - STAGE_MARGIN * 2,
    height: H - STAGE_MARGIN * 2,
    z_index: 0,
    style: { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 2 },
    locked: true,
  });
}

function conductor(x = W / 2, y = H - 140) {
  return obj({
    object_type: 'label',
    subtype: 'conductor',
    x: x - 40,
    y,
    width: 80,
    height: 24,
    label: 'Conductor',
    style: { fill: '#111827', color: '#fff', fontWeight: 700 },
    z_index: 5,
    locked: true,
  });
}

function audience() {
  return obj({
    object_type: 'label',
    subtype: 'audience',
    x: W / 2 - 60,
    y: H - 40,
    width: 120,
    height: 20,
    label: 'Audience',
    style: { fill: 'transparent', color: '#64748b' },
    z_index: 1,
    locked: true,
  });
}

function riserRow(rowIndex: number, rowSize: number, rowY: number, sections: string[]): TemplateSpec['objects'] {
  const pts = arcPoints(W / 2, rowY + 400, 420 - rowIndex * 20, rowSize, 140);
  const perSection = Math.ceil(rowSize / sections.length);
  return pts.map((p, i) => {
    const sectionKey = sections[Math.min(sections.length - 1, Math.floor(i / perSection))];
    const color = (SECTION_COLORS as Record<string, string>)[sectionKey] ?? SECTION_COLORS.neutral;
    return obj({
      object_type: 'riser_slot',
      subtype: 'choir',
      x: p.x - 22,
      y: p.y - 22,
      width: 44,
      height: 44,
      label: `${rowIndex + 1}·${i + 1}`,
      style: { fill: color, stroke: '#0f172a', strokeWidth: 1, radius: 12 },
      properties: { row: rowIndex + 1, position: i + 1, section: sectionKey },
    });
  });
}

// 1. SATB Sectional Choir — voice parts grouped left-to-right
function satbSectional(): TemplateSpec {
  const rows = 4;
  const perRow = 12;
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  for (let r = 0; r < rows; r++) {
    objects.push(...riserRow(r, perRow, 160 + r * 70, ['soprano', 'alto', 'tenor', 'bass']));
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 2. SATB Mixed Formation — quartet interleave
function satbMixed(): TemplateSpec {
  const rows = 4;
  const perRow = 12;
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  const pattern = ['soprano', 'alto', 'tenor', 'bass'];
  for (let r = 0; r < rows; r++) {
    const pts = arcPoints(W / 2, 160 + r * 70 + 400, 420 - r * 20, perRow, 140);
    pts.forEach((p, i) => {
      const sec = pattern[(i + r) % pattern.length];
      objects.push(
        obj({
          object_type: 'riser_slot',
          subtype: 'choir',
          x: p.x - 22,
          y: p.y - 22,
          label: `${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], stroke: '#0f172a', strokeWidth: 1, radius: 12 },
          properties: { row: r + 1, position: i + 1, section: sec },
        }),
      );
    });
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 3. Treble Choir (SSA)
function treble(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  for (let r = 0; r < 3; r++) {
    objects.push(...riserRow(r, 12, 200 + r * 80, ['s1', 's2', 'a1', 'a2']));
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 4. Tenor-Bass Choir (TTB / TTBB)
function tenorBass(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  for (let r = 0; r < 3; r++) {
    objects.push(...riserRow(r, 12, 200 + r * 80, ['t1', 't2', 'b1', 'b2']));
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 5. Chamber Choir — 16 singers in one row, mixed quartets
function chamber(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  const pattern = ['soprano', 'alto', 'tenor', 'bass'];
  const pts = arcPoints(W / 2, 500, 380, 16, 160);
  pts.forEach((p, i) => {
    const sec = pattern[i % pattern.length];
    objects.push(
      obj({
        object_type: 'riser_slot',
        subtype: 'chamber',
        x: p.x - 26,
        y: p.y - 26,
        width: 52,
        height: 52,
        label: `${i + 1}`,
        style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], stroke: '#0f172a', strokeWidth: 1, radius: 14 },
        properties: { position: i + 1, section: sec },
      }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 6. Show Choir — front row curved, mic stands, drum kit rear
function showChoir(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(W / 2, H - 100), audience()];
  for (let r = 0; r < 3; r++) {
    objects.push(...riserRow(r, 12, 220 + r * 80, ['soprano', 'alto', 'tenor', 'bass']));
  }
  // Rhythm section rear
  objects.push(
    obj({ object_type: 'instrument', subtype: 'drums', x: 180, y: 120, width: 100, height: 100, label: 'Drums', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'piano', x: W - 300, y: 120, width: 140, height: 80, label: 'Piano', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 - 100, y: 460, width: 20, height: 20, label: 'Mic', style: { fill: '#f97316' } }),
    obj({ object_type: 'microphone', subtype: 'vocal', x: W / 2 + 80, y: 460, width: 20, height: 20, label: 'Mic', style: { fill: '#f97316' } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 7. Gospel Choir with Rhythm Section
function gospelChoir(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(W / 2, H - 100), audience()];
  for (let r = 0; r < 4; r++) {
    objects.push(...riserRow(r, 12, 220 + r * 70, ['soprano', 'alto', 'tenor']));
  }
  objects.push(
    obj({ object_type: 'instrument', subtype: 'drums', x: 180, y: 120, width: 110, height: 110, label: 'Drums', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'organ', x: 320, y: 130, width: 140, height: 70, label: 'Organ', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'piano', x: 480, y: 130, width: 140, height: 70, label: 'Piano', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'bass', x: W - 300, y: 130, width: 60, height: 90, label: 'Bass', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'guitar', x: W - 220, y: 140, width: 80, height: 60, label: 'Guitar', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 8. Choir Horseshoe
function choirHorseshoe(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(W / 2, H / 2), audience()];
  const parts = ['soprano', 'alto', 'tenor', 'bass'];
  const perLeg = 8;
  // Left leg (top → bottom)
  for (let i = 0; i < perLeg; i++) {
    objects.push(
      obj({
        object_type: 'riser_slot',
        x: 260,
        y: 150 + i * 60,
        label: `L${i + 1}`,
        style: { fill: SECTION_COLORS[parts[i % 4] as keyof typeof SECTION_COLORS], radius: 12, stroke: '#0f172a', strokeWidth: 1 },
        properties: { leg: 'L', section: parts[i % 4] },
      }),
    );
  }
  // Back
  for (let i = 0; i < 12; i++) {
    objects.push(
      obj({
        object_type: 'riser_slot',
        x: 340 + i * 60,
        y: 130,
        label: `B${i + 1}`,
        style: { fill: SECTION_COLORS[parts[i % 4] as keyof typeof SECTION_COLORS], radius: 12, stroke: '#0f172a', strokeWidth: 1 },
        properties: { leg: 'B', section: parts[i % 4] },
      }),
    );
  }
  // Right leg
  for (let i = 0; i < perLeg; i++) {
    objects.push(
      obj({
        object_type: 'riser_slot',
        x: 1080,
        y: 150 + i * 60,
        label: `R${i + 1}`,
        style: { fill: SECTION_COLORS[parts[i % 4] as keyof typeof SECTION_COLORS], radius: 12, stroke: '#0f172a', strokeWidth: 1 },
        properties: { leg: 'R', section: parts[i % 4] },
      }),
    );
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 9. Choir Risers — 4 straight rows × 12
function straightRisers(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  const perRow = 12;
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < perRow; i++) {
      const sec = ['soprano', 'alto', 'tenor', 'bass'][Math.floor(i / (perRow / 4))];
      objects.push(
        obj({
          object_type: 'riser_slot',
          subtype: 'straight',
          x: 260 + i * 76,
          y: 180 + r * 80,
          label: `${r + 1}·${i + 1}`,
          style: {
            fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS],
            radius: 8,
            stroke: '#0f172a',
            strokeWidth: 1,
          },
          properties: { row: r + 1, position: i + 1, section: sec },
        }),
      );
    }
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const CHOIR_TEMPLATES: TemplateEntry[] = [
  { key: 'choir_satb_sectional', name: 'SATB Sectional Choir', category: 'choir',
    description: 'Voice parts grouped by section across curved risers.', generate: satbSectional },
  { key: 'choir_satb_mixed', name: 'SATB Mixed Formation', category: 'choir',
    description: 'Interleaved SATB quartets across the ensemble.', generate: satbMixed },
  { key: 'choir_treble', name: 'Treble Choir (SSA)', category: 'choir',
    description: 'Three rows of SSA voicing.', generate: treble },
  { key: 'choir_tenor_bass', name: 'Tenor-Bass Choir (TTBB)', category: 'choir',
    description: 'Three rows of tenor / bass voicing.', generate: tenorBass },
  { key: 'choir_chamber', name: 'Chamber Choir', category: 'choir',
    description: '16 singers in one row, mixed quartets.', generate: chamber },
  { key: 'choir_show', name: 'Show Choir', category: 'choir',
    description: 'Choir + rhythm section + vocal microphones.', generate: showChoir },
  { key: 'choir_gospel', name: 'Gospel Choir with Rhythm', category: 'choir',
    description: 'Gospel voicing plus organ, piano, bass, drums.', generate: gospelChoir },
  { key: 'choir_horseshoe', name: 'Choir Horseshoe', category: 'choir',
    description: 'U-shape with conductor centered.', generate: choirHorseshoe },
  { key: 'choir_risers_straight', name: 'Choir Risers (Straight)', category: 'choir',
    description: '4 straight rows × 12 singers.', generate: straightRisers },
];
