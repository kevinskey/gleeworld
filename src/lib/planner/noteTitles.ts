// Display title for a note row: explicit title, else the period title
// derived from its date key, else a placeholder.
import { keyTitle, typeOfKey } from './dateKeys';
import type { NoteType } from './types';

export function noteDisplayTitle(title: string, noteType: NoteType, dateKey: string | null): string {
  if (title.trim()) return title;
  if (noteType !== 'note' && dateKey) {
    const t = typeOfKey(dateKey);
    if (t) return keyTitle(dateKey, t);
  }
  return 'Untitled note';
}
