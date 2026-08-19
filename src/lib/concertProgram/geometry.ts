import type { ProgramFormat } from './types';

// All paper geometry in inches (spec: "All type in points, all geometry in inches").
export const PX_PER_IN = 96; // CSS reference pixel

export const LETTER = { sheetW: 8.5, sheetH: 11, pad: 0.75 } as const;
export const PANEL  = { sheetW: 5.5, sheetH: 8.5, pad: 0.5 } as const;

export function contentWidthIn(format: ProgramFormat): number {
  return format === 'half-fold' ? PANEL.sheetW - 2 * PANEL.pad : LETTER.sheetW - 2 * LETTER.pad;
}
export function contentHeightIn(format: ProgramFormat): number {
  return format === 'half-fold' ? PANEL.sheetH - 2 * PANEL.pad : LETTER.sheetH - 2 * LETTER.pad;
}
