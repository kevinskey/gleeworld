// Blank / freeform starting templates. Small primitives directors can drop
// down and extend, rather than one giant seed layout.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { SECTION_COLORS, arcPoints, obj } from './utils';

const W = 1400;
const H = 800;

function blank(): TemplateSpec {
  return {
    chart_mode: 'seating',
    canvas_width: W,
    canvas_height: H,
    orientation: 'landscape',
    objects: [
      obj({
        object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
        z_index: 0, style: { fill: 'transparent', stroke: '#e2e8f0', strokeWidth: 2 }, locked: false,
      }),
    ],
  };
}

// Single straight row of 12 chairs — easy start for a small ensemble
function singleRow(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
      z_index: 0, style: { fill: 'transparent', stroke: '#e2e8f0', strokeWidth: 2 }, locked: false }),
  ];
  for (let i = 0; i < 12; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'generic', x: 220 + i * 80, y: H / 2 - 24, width: 48, height: 48, label: `${i + 1}`,
        style: { fill: SECTION_COLORS.neutral, radius: 24, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1 } }),
    );
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// Single arc of 12 chairs — chamber ensemble seed
function singleArc(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
      z_index: 0, style: { fill: 'transparent', stroke: '#e2e8f0', strokeWidth: 2 }, locked: false }),
  ];
  const pts = arcPoints(W / 2, 520, 340, 12, 150);
  pts.forEach((p, i) => {
    objects.push(
      obj({ object_type: 'chair', subtype: 'generic', x: p.x - 24, y: p.y - 24, width: 48, height: 48, label: `${i + 1}`,
        style: { fill: SECTION_COLORS.neutral, radius: 24, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1 } }),
    );
  });
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// Full circle of 12 chairs
function circle(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
      z_index: 0, style: { fill: 'transparent', stroke: '#e2e8f0', strokeWidth: 2 }, locked: false }),
  ];
  const cx = W / 2;
  const cy = H / 2 - 20;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    objects.push(
      obj({ object_type: 'chair', subtype: 'generic', x: cx + 300 * Math.cos(angle) - 24, y: cy + 220 * Math.sin(angle) - 24,
        width: 48, height: 48, label: `${i + 1}`,
        style: { fill: SECTION_COLORS.neutral, radius: 24, stroke: '#0f172a', strokeWidth: 1 },
        properties: { position: i + 1 } }),
    );
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// Simple 6×6 grid of chairs
function grid66(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [
    obj({ object_type: 'stage_boundary', x: 60, y: 60, width: W - 120, height: H - 120,
      z_index: 0, style: { fill: 'transparent', stroke: '#e2e8f0', strokeWidth: 2 }, locked: false }),
  ];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      objects.push(
        obj({ object_type: 'chair', subtype: 'generic', x: 300 + c * 130, y: 180 + r * 90, width: 44, height: 44,
          label: `${r + 1}·${c + 1}`,
          style: { fill: SECTION_COLORS.neutral, radius: 22, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, col: c + 1 } }),
      );
    }
  }
  return { chart_mode: 'seating', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const CUSTOM_TEMPLATES: TemplateEntry[] = [
  { key: 'custom_blank', name: 'Blank Custom Chart', category: 'custom',
    description: 'Empty canvas — build from scratch.', generate: blank },
  { key: 'custom_single_row', name: 'Single Row (12 chairs)', category: 'custom',
    description: 'A single row of 12 unlabeled chairs, easy to extend.', generate: singleRow },
  { key: 'custom_single_arc', name: 'Single Arc (12 chairs)', category: 'custom',
    description: 'A gentle chamber arc of 12 chairs across the stage.', generate: singleArc },
  { key: 'custom_circle', name: 'Circle (12 chairs)', category: 'custom',
    description: '12 chairs ringed around center stage.', generate: circle },
  { key: 'custom_grid_6x6', name: '6 × 6 Chair Grid', category: 'custom',
    description: '36 chairs in a rectangular grid — good rehearsal-hall starter.', generate: grid66 },
];
