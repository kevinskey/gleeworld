import type { PartTrackPart, PartTrackRights, PartTrackScore } from './types';

export function canGenerate(
  score: PartTrackScore,
  parts: PartTrackPart[],
  rights: PartTrackRights | null,
  warningsAcked: boolean,
): { ok: boolean; reason: string | null } {
  const included = parts.filter((p) => p.include);
  if (included.length === 0) return { ok: false, reason: 'Include at least one part.' };
  if (!included.every((p) => p.confirmed)) return { ok: false, reason: 'Confirm the part mapping first.' };
  if ((score.validation_report?.length ?? 0) > 0 && !warningsAcked)
    return { ok: false, reason: 'Review and acknowledge the warnings first.' };
  if (!rights) return { ok: false, reason: 'Attest rights before generating.' };
  if ((rights.basis === 'ccli' || rights.basis === 'onelicense') && !rights.license_number?.trim())
    return { ok: false, reason: 'A license number is required for this rights basis.' };
  return { ok: true, reason: null };
}
