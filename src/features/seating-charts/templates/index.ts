// Central template registry. Every chart's `template_key` maps to one entry.
import type { TemplateCategory, TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { CHOIR_TEMPLATES } from './choir';
import { BAND_TEMPLATES } from './band';
import { ORCHESTRA_TEMPLATES } from './orchestra';
import { OTHER_MUSIC_TEMPLATES } from './otherMusic';
import { CLASSROOM_TEMPLATES } from './classroom';
import { CUSTOM_TEMPLATES } from './custom';

export const ALL_TEMPLATES: TemplateEntry[] = [
  ...CHOIR_TEMPLATES,
  ...BAND_TEMPLATES,
  ...ORCHESTRA_TEMPLATES,
  ...OTHER_MUSIC_TEMPLATES,
  ...CLASSROOM_TEMPLATES,
  ...CUSTOM_TEMPLATES,
];

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  choir: 'Choir',
  band: 'Band',
  orchestra: 'Orchestra',
  other_music: 'Other Music',
  classroom: 'Classroom',
  stage_plot: 'Stage Plots',
  custom: 'Custom',
};

export function templatesByCategory(): Record<TemplateCategory, TemplateEntry[]> {
  const out = {
    choir: [], band: [], orchestra: [], other_music: [], classroom: [], stage_plot: [], custom: [],
  } as Record<TemplateCategory, TemplateEntry[]>;
  ALL_TEMPLATES.forEach((t) => out[t.category].push(t));
  return out;
}

export function getTemplate(key: string): TemplateEntry | undefined {
  return ALL_TEMPLATES.find((t) => t.key === key);
}

export function generateTemplate(key: string, config?: Record<string, unknown>): TemplateSpec | null {
  const entry = getTemplate(key);
  return entry ? entry.generate(config) : null;
}

export { CHOIR_TEMPLATES, BAND_TEMPLATES, ORCHESTRA_TEMPLATES, OTHER_MUSIC_TEMPLATES, CLASSROOM_TEMPLATES, CUSTOM_TEMPLATES };
