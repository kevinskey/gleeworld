// Conversion between stored UTC timestamps and the value an
// <input type="datetime-local"> expects, which is always wall-clock local
// time with no zone suffix. Getting this wrong shifts every auction date by
// the viewer's UTC offset, so it lives here with tests rather than inline.

const pad = (n: number) => String(n).padStart(2, '0');

// ISO/UTC → 'YYYY-MM-DDTHH:mm' in the viewer's local time.
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) +
    ':' + pad(d.getMinutes())
  );
}

// 'YYYY-MM-DDTHH:mm' (local) → UTC ISO string, or null when the field is
// blank or unparseable. Never returns an Invalid Date — an empty date field
// must reach the database as NULL, not as garbage.
export function fromLocalInput(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
