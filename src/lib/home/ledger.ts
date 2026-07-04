export type LedgerGlyph = 'note' | 'rest' | 'future';

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ledgerGlyphs(practicedISODates: string[], today: Date): LedgerGlyph[] {
  const practiced = new Set(
    practicedISODates.map((s) => (s.length > 10 ? localDayKey(new Date(s)) : s)),
  );
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  const todayKey = localDayKey(today);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const key = localDayKey(day);
    if (key > todayKey) return 'future';
    return practiced.has(key) ? 'note' : 'rest';
  });
}
