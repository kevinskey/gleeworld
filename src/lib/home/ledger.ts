export type LedgerGlyph = 'note' | 'rest' | 'future';

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ledgerGlyphs(practicedISODates: string[], today: Date): LedgerGlyph[] {
  const practiced = new Set(
    practicedISODates.map((s) => (s.length > 10 ? new Date(s).toISOString().slice(0, 10) : s)),
  );
  const dow = (today.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - dow);
  const todayKey = isoDay(today);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    const key = isoDay(day);
    if (key > todayKey) return 'future';
    return practiced.has(key) ? 'note' : 'rest';
  });
}
