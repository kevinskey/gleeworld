import type { ExerciseIR } from '@/lib/sightReading/ir';
import { isValidIr } from '@/lib/sightReading/irValidate';

interface EarItem { ir: ExerciseIR; choices: string[]; answer: number; explanation?: string }

export type ParsedExercise =
  | { kind: 'notated'; mode: 'pitch' | 'click'; segments: ExerciseIR[]; instructions?: string;
      prepChecklist?: string[]; deepLink: boolean; modulation?: { atBeat: number; toKey: string } }
  | { kind: 'ear_training'; prompt: string; items: EarItem[] }
  | { kind: 'dictation'; prompt: string; ir: ExerciseIR; playLimit: number }
  | { kind: 'ensemble'; instructions?: string; parts: { label: string; ir: ExerciseIR }[] }
  | { kind: 'assignment'; instructions: string[]; deliverables: string[];
      rubric: { criterion: string; percent: number }[] };

const strArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');

export function parseExercise(type: string, data: unknown): ParsedExercise | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (type === 'melody' || type === 'solfege_drill' || type === 'rhythm') {
    const segments = Array.isArray(d.segments) ? d.segments : d.ir ? [d.ir] : [];
    if (segments.length === 0 || !segments.every(isValidIr)) return null;
    const mod = d.modulation as { atBeat: number; toKey: string } | undefined;
    return {
      kind: 'notated',
      mode: type === 'rhythm' ? 'click' : 'pitch',
      segments: segments as ExerciseIR[],
      instructions: typeof d.instructions === 'string' ? d.instructions : undefined,
      prepChecklist: strArr(d.prepChecklist) ? d.prepChecklist : undefined,
      // The studio's deep-link loader only reads the raw top-level `ir` field
      // (see SightReadingStudio's academyExercise effect), not `segments`. A
      // segments-only melody (e.g. Week 13's changing-meter exercise) has no
      // valid top-level ir, so offering the deep-link button would always
      // fail with a toast — gate it on the same check the loader performs.
      deepLink: type === 'melody' && isValidIr(d.ir),
      modulation: mod && Number.isFinite(mod.atBeat) && typeof mod.toKey === 'string' ? mod : undefined,
    };
  }
  if (type === 'ear_training') {
    if (typeof d.prompt !== 'string' || !Array.isArray(d.items) || d.items.length === 0) return null;
    const items = d.items as { ir: unknown; choices: unknown; answer: unknown; explanation?: unknown }[];
    for (const it of items) {
      if (!isValidIr(it.ir) || !strArr(it.choices)) return null;
      if (typeof it.answer !== 'number' || !Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.choices.length) return null;
    }
    return { kind: 'ear_training', prompt: d.prompt, items: items as EarItem[] };
  }
  if (type === 'dictation') {
    if (typeof d.prompt !== 'string' || !isValidIr(d.ir)) return null;
    const playLimit = typeof d.playLimit === 'number' && d.playLimit > 0 ? d.playLimit : 3;
    return { kind: 'dictation', prompt: d.prompt, ir: d.ir, playLimit };
  }
  if (type === 'ensemble') {
    if (!Array.isArray(d.parts) || d.parts.length === 0) return null;
    const parts = d.parts as { label: unknown; ir: unknown }[];
    if (!parts.every((p) => typeof p.label === 'string' && isValidIr(p.ir))) return null;
    return { kind: 'ensemble', parts: parts as { label: string; ir: ExerciseIR }[],
      instructions: typeof d.instructions === 'string' ? d.instructions : undefined };
  }
  if (type === 'assignment') {
    if (!strArr(d.instructions) || !strArr(d.deliverables) || !Array.isArray(d.rubric)) return null;
    const rubric = d.rubric as { criterion: unknown; percent: unknown }[];
    if (!rubric.every((r) => typeof r.criterion === 'string' && typeof r.percent === 'number')) return null;
    return { kind: 'assignment', instructions: d.instructions, deliverables: d.deliverables,
      rubric: rubric as { criterion: string; percent: number }[] };
  }
  return null;
}
