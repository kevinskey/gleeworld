export type NoteColor = 'pink' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange';

interface NoteClasses {
  bg: string;
  border: string;
  tape: string;
  text: string;
  meta: string;
  heart: string;
}

export const NOTE_PALETTE: Record<NoteColor, NoteClasses> = {
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/30',
    border: 'border-pink-200 dark:border-pink-500/40',
    tape: 'bg-pink-300/60 dark:bg-pink-400/50',
    text: 'text-pink-950 dark:text-pink-50',
    meta: 'text-pink-700 dark:text-pink-200',
    heart: 'text-pink-500 dark:text-pink-300',
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-500/40',
    tape: 'bg-amber-300/60 dark:bg-amber-400/50',
    text: 'text-amber-950 dark:text-amber-50',
    meta: 'text-amber-700 dark:text-amber-200',
    heart: 'text-amber-500 dark:text-amber-300',
  },
  blue: {
    bg: 'bg-sky-50 dark:bg-sky-900/30',
    border: 'border-sky-200 dark:border-sky-500/40',
    tape: 'bg-sky-300/60 dark:bg-sky-400/50',
    text: 'text-sky-950 dark:text-sky-50',
    meta: 'text-sky-700 dark:text-sky-200',
    heart: 'text-sky-500 dark:text-sky-300',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-500/40',
    tape: 'bg-emerald-300/60 dark:bg-emerald-400/50',
    text: 'text-emerald-950 dark:text-emerald-50',
    meta: 'text-emerald-700 dark:text-emerald-200',
    heart: 'text-emerald-500 dark:text-emerald-300',
  },
  purple: {
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    border: 'border-violet-200 dark:border-violet-500/40',
    tape: 'bg-violet-300/60 dark:bg-violet-400/50',
    text: 'text-violet-950 dark:text-violet-50',
    meta: 'text-violet-700 dark:text-violet-200',
    heart: 'text-violet-500 dark:text-violet-300',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-500/40',
    tape: 'bg-orange-300/60 dark:bg-orange-400/50',
    text: 'text-orange-950 dark:text-orange-50',
    meta: 'text-orange-700 dark:text-orange-200',
    heart: 'text-orange-500 dark:text-orange-300',
  },
};

export function getNoteClasses(color: string) {
  const key = (['pink', 'yellow', 'blue', 'green', 'purple', 'orange'] as const).includes(
    color as NoteColor,
  )
    ? (color as NoteColor)
    : 'pink';
  const p = NOTE_PALETTE[key];
  return {
    container: `${p.bg} ${p.border} ${p.text}`,
    meta: p.meta,
    heart: p.heart,
    tape: p.tape,
    bg: p.bg,
    border: p.border,
  };
}
