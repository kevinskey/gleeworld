// Blank / freeform starting template.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { obj } from './utils';

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

export const CUSTOM_TEMPLATES: TemplateEntry[] = [
  { key: 'custom_blank', name: 'Blank Custom Chart', category: 'custom',
    description: 'Empty canvas — build from scratch.', generate: blank },
];
