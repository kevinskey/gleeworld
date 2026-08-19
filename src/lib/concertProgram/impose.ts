// Saddle imposition for half-fold booklets (spec "Page geometry & pagination"):
// for N panels (multiple of 4), sheet k front = [panel N−2k | panel 1+2k],
// back = [panel 2+2k | panel N−1−2k] (1-based). Back order assumes duplex
// "flip on short edge"; flipMode makes a differently-behaving printer a
// config change, not a rewrite.
export type FlipMode = 'short-edge' | 'long-edge';
export interface ImposedSheet { front: [number, number]; back: [number, number] }

export function paddedPanelCount(panelCount: number): number {
  return Math.max(4, Math.ceil(panelCount / 4) * 4);
}

export function imposeHalfFold(panelCount: number, flip: FlipMode = 'short-edge'): ImposedSheet[] {
  const n = paddedPanelCount(panelCount);
  const sheets: ImposedSheet[] = [];
  for (let k = 0; k < n / 4; k++) {
    const front: [number, number] = [n - 1 - 2 * k, 2 * k];
    const back: [number, number] = [2 * k + 1, n - 2 - 2 * k];
    sheets.push({ front, back: flip === 'short-edge' ? back : [back[1], back[0]] });
  }
  return sheets;
}
