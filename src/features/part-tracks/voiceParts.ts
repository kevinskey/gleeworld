// One normalizer for the two voice-part vocabularies in play:
// PartTrack roles ('soprano_1') and profile codes ('S1', per prod data).
const LETTERS: Record<string, string> = {
  soprano: 'S', alto: 'A', tenor: 'T', bass: 'B', baritone: 'B',
  s: 'S', a: 'A', t: 'T', b: 'B',
};

export function normalizeVoicePart(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith('piano') || raw.startsWith('accomp') || raw.startsWith('organ')) return 'PIANO';
  if (raw === 'other') return 'OTHER';
  const m = raw.match(/^([a-z]+)[\s_-]*([12])?$/);
  if (!m) return null;
  const letter = LETTERS[m[1]];
  if (!letter) return null;
  return m[2] ? `${letter}${m[2]}` : letter;
}

export function voicePartsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeVoicePart(a);
  const nb = normalizeVoicePart(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Sectionless matches sectioned within the same letter (S ~ S1/S2).
  return na[0] === nb[0] && (na.length === 1 || nb.length === 1);
}
