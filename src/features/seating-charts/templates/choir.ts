// Choir templates. Keeps section-color choices consistent across every
// variant, and shares stage/conductor/audience anchors.
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

function conductor(x = W / 2, y = H - 140, label = 'Conductor') {
  return obj({
    object_type: 'label',
    subtype: 'conductor',
    x: x - 40,
    y,
    width: 80,
    height: 24,
    label,
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

// 10. SAB — three-part beginning-level choir
function sabChoir(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  for (let r = 0; r < 3; r++) {
    objects.push(...riserRow(r, 12, 220 + r * 80, ['soprano', 'alto', 'bass']));
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 11. SSAA Women's Choir — 4 rows
function ssaaWomens(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  for (let r = 0; r < 4; r++) {
    objects.push(...riserRow(r, 12, 180 + r * 70, ['s1', 's2', 'a1', 'a2']));
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 12. Double Choir — SATB + SATB antiphonally left/right
function doubleChoir(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  const parts = ['soprano', 'alto', 'tenor', 'bass'];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 8; i++) {
      const sec = parts[Math.floor(i / 2)];
      objects.push(
        obj({
          object_type: 'riser_slot', subtype: 'choir_i',
          x: 160 + i * 60, y: 200 + r * 70,
          label: `I·${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 10, stroke: '#0f172a', strokeWidth: 1 },
          properties: { choir: 'I', row: r + 1, position: i + 1, section: sec },
        }),
        obj({
          object_type: 'riser_slot', subtype: 'choir_ii',
          x: 800 + i * 60, y: 200 + r * 70,
          label: `II·${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 10, stroke: '#7c3aed', strokeWidth: 2 },
          properties: { choir: 'II', row: r + 1, position: i + 1, section: sec },
        }),
      );
    }
  }
  objects.push(
    obj({ object_type: 'label', subtype: 'group', x: 300, y: 160, width: 100, height: 20, label: 'Choir I', style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'label', subtype: 'group', x: 940, y: 160, width: 100, height: 20, label: 'Choir II', style: { fill: 'transparent', color: '#7c3aed', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 13. Madrigal Circle — 12 singers around a music table
function madrigalCircle(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), audience()];
  const cx = W / 2;
  const cy = H / 2 - 20;
  const parts = ['soprano', 'alto', 'tenor', 'bass'];
  objects.push(
    obj({ object_type: 'table', subtype: 'madrigal', x: cx - 120, y: cy - 60, width: 240, height: 120, label: 'Music table',
      style: { fill: '#fef3c7', stroke: '#92400e', strokeWidth: 2, radius: 8 }, locked: true }),
  );
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const rx = 280, ry = 200;
    const sec = parts[i % 4];
    objects.push(
      obj({
        object_type: 'chair', subtype: 'madrigal',
        x: cx + rx * Math.cos(angle) - 22,
        y: cy + ry * Math.sin(angle) - 22,
        width: 44, height: 44,
        label: `${i + 1}`,
        style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 22, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1, section: sec },
      }),
    );
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 14. A Cappella Vocal Group — 8 vocalists with individual mics
function aCappellaGroup(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), audience()];
  const roles = [
    { label: 'Sop 1', sec: 's1' },
    { label: 'Sop 2', sec: 's2' },
    { label: 'Alto 1', sec: 'a1' },
    { label: 'Alto 2', sec: 'a2' },
    { label: 'Tenor 1', sec: 't1' },
    { label: 'Tenor 2', sec: 't2' },
    { label: 'Bass', sec: 'bass' },
    { label: 'V.P.', sec: 'perc' },
  ];
  const pts = arcPoints(W / 2, 500, 380, roles.length, 150);
  pts.forEach((p, i) => {
    const r = roles[i];
    objects.push(
      obj({ object_type: 'chair', subtype: 'a_cappella', x: p.x - 26, y: p.y - 26, width: 52, height: 52, label: r.label,
        style: { fill: SECTION_COLORS[r.sec as keyof typeof SECTION_COLORS], radius: 26, stroke: '#0f172a', strokeWidth: 1 },
        properties: { section: r.sec, position: i + 1 } }),
      obj({ object_type: 'microphone', subtype: 'vocal', x: p.x - 8, y: p.y + 40, width: 16, height: 16, label: '',
        style: { fill: '#f97316' } }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 15. Children's Choir — unison / 2-part, small stature = tight row spacing
function childrensChoir(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(W / 2, H - 120), audience()];
  const parts = ['soprano', 'alto'];
  for (let r = 0; r < 3; r++) {
    const pts = arcPoints(W / 2, r * 70 + 500, 380 - r * 15, 14, 130);
    pts.forEach((p, i) => {
      const sec = parts[Math.floor(i / 7)];
      objects.push(
        obj({
          object_type: 'riser_slot', subtype: 'child',
          x: p.x - 18, y: p.y - 18, width: 36, height: 36,
          label: `${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 10, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, position: i + 1, section: sec },
        }),
      );
    });
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 16. Cathedral Choir — decani / cantoris split with choir stalls
function cathedralChoir(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), audience()];
  const parts = ['soprano', 'alto', 'tenor', 'bass'];
  // Decani (right) and Cantoris (left) facing each other across the chancel.
  for (let side = 0; side < 2; side++) {
    const baseX = side === 0 ? 200 : W - 260;
    const label = side === 0 ? 'Cantoris' : 'Decani';
    objects.push(
      obj({ object_type: 'label', subtype: 'group', x: baseX + 10, y: 100, width: 120, height: 20, label,
        style: { fill: 'transparent', color: '#0f172a', fontWeight: 700 }, locked: true }),
    );
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 8; i++) {
        const sec = parts[Math.floor(i / 2)];
        objects.push(
          obj({
            object_type: 'chair', subtype: 'stall',
            x: baseX + row * 40, y: 160 + i * 60,
            width: 36, height: 44,
            label: `${row + 1}·${i + 1}`,
            style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 4, stroke: '#78350f', strokeWidth: 2 },
            properties: { side: label.toLowerCase(), row: row + 1, position: i + 1, section: sec },
          }),
        );
      }
    }
  }
  // Organ console + altar centered
  objects.push(
    obj({ object_type: 'instrument', subtype: 'organ', x: W / 2 - 90, y: 130, width: 180, height: 90, label: 'Organ',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'label', subtype: 'altar', x: W / 2 - 60, y: H - 200, width: 120, height: 30, label: 'Altar',
      style: { fill: '#fef3c7', color: '#78350f', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 17. Divisi SATB (8 parts) — S1 S2 A1 A2 T1 T2 B1 B2
function divisiEightParts(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), conductor(), audience()];
  const parts = ['s1', 's2', 'a1', 'a2', 't1', 't2', 'b1', 'b2'];
  for (let r = 0; r < 4; r++) {
    const pts = arcPoints(W / 2, 160 + r * 70 + 400, 420 - r * 20, 16, 150);
    pts.forEach((p, i) => {
      const sec = parts[Math.floor(i / 2)];
      objects.push(
        obj({
          object_type: 'riser_slot', subtype: 'divisi',
          x: p.x - 22, y: p.y - 22, width: 44, height: 44,
          label: `${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 10, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, position: i + 1, section: sec },
        }),
      );
    });
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 18. Jazz Vocal Ensemble — 4-part chairs with rhythm section
function jazzVocalEnsemble(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [stageBoundary(), audience()];
  const singers = ['soprano', 'alto', 'tenor', 'bass'];
  for (let i = 0; i < 8; i++) {
    const sec = singers[i % 4];
    objects.push(
      obj({ object_type: 'chair', subtype: 'jazz_vocal', x: 320 + i * 90, y: 480, width: 44, height: 44,
        label: `${i + 1}`, style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 22, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1, section: sec } }),
      obj({ object_type: 'microphone', subtype: 'vocal', x: 336 + i * 90, y: 540, width: 12, height: 12,
        style: { fill: '#f97316' } }),
    );
  }
  objects.push(
    obj({ object_type: 'instrument', subtype: 'piano', x: 200, y: 160, width: 160, height: 80, label: 'Piano', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'bass', x: 400, y: 160, width: 60, height: 100, label: 'Bass', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'drums', x: 500, y: 160, width: 110, height: 110, label: 'Drums', style: { fill: '#111827', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'guitar', x: 640, y: 180, width: 100, height: 60, label: 'Guitar', style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
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
  { key: 'choir_sab', name: 'SAB Choir (3-part)', category: 'choir',
    description: 'Soprano/Alto/Baritone — approachable beginning voicing.', generate: sabChoir },
  { key: 'choir_ssaa_womens', name: "Women's Choir (SSAA)", category: 'choir',
    description: '4 rows of SSAA voicing on curved risers.', generate: ssaaWomens },
  { key: 'choir_double', name: 'Double Choir (Antiphonal SATB + SATB)', category: 'choir',
    description: 'Two independent SATB choirs across the stage for antiphonal repertoire.', generate: doubleChoir },
  { key: 'choir_madrigal', name: 'Madrigal Circle', category: 'choir',
    description: '12 singers ringed around a music table for madrigal singing.', generate: madrigalCircle },
  { key: 'choir_a_cappella', name: 'A Cappella Vocal Group (8)', category: 'choir',
    description: '8 vocalists on a curved front line, each on their own mic.', generate: aCappellaGroup },
  { key: 'choir_childrens', name: "Children's Choir (2-part)", category: 'choir',
    description: 'Small-stature risers for unison / 2-part children\'s voicing.', generate: childrensChoir },
  { key: 'choir_cathedral', name: 'Cathedral Choir (Decani / Cantoris)', category: 'choir',
    description: 'Facing choir stalls with organ + altar for liturgical spaces.', generate: cathedralChoir },
  { key: 'choir_divisi_8', name: 'Divisi SATB (8 parts)', category: 'choir',
    description: 'S1/S2 A1/A2 T1/T2 B1/B2 layered for larger divisi works.', generate: divisiEightParts },
  { key: 'choir_jazz_vocal', name: 'Jazz Vocal Ensemble', category: 'choir',
    description: '8 vocalists with individual mics and full jazz rhythm section.', generate: jazzVocalEnsemble },
];
