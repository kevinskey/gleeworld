// Mirrors the DB check on gw_parttrack_scores.tempo_override_bpm.
export const TEMPO_BPM_MIN = 20;
export const TEMPO_BPM_MAX = 300;

export type TempoParse = { ok: boolean; value: number | null; message?: string };

export function parseTempoBpm(input: string): TempoParse {
  const t = input.trim();
  if (t === '') return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isInteger(n)) {
    return { ok: false, value: null, message: 'Tempo must be a whole number of BPM.' };
  }
  if (n < TEMPO_BPM_MIN || n > TEMPO_BPM_MAX) {
    return { ok: false, value: null, message: `Tempo must be between ${TEMPO_BPM_MIN} and ${TEMPO_BPM_MAX} BPM.` };
  }
  return { ok: true, value: n };
}
