export interface EventType {
  value: string;
  label: string;
  color?: string;
  description?: string;
}

export const EVENT_TYPES: EventType[] = [
  { value: 'rehearsal', label: 'Rehearsal', color: 'blue', description: 'Regular ensemble or section practice' },
  { value: 'sectional', label: 'Sectional', color: 'sky', description: 'Voice-part or instrument-section practice' },
  { value: 'concert', label: 'Concert', color: 'purple', description: 'Public performance' },
  { value: 'service', label: 'Church Service / Mass', color: 'violet', description: 'Worship service, Mass, or liturgy' },
  { value: 'performance', label: 'Performance', color: 'fuchsia', description: 'Off-site or special performance' },
  { value: 'tour-event', label: 'Tour Event', color: 'pink', description: 'Travel performance or related event' },
  { value: 'audition', label: 'Audition', color: 'amber', description: 'Auditions for placement or solos' },
  { value: 'recording', label: 'Recording Session', color: 'rose', description: 'Studio or location recording' },
  { value: 'festival', label: 'Festival / Competition', color: 'orange', description: 'Festival, competition, or adjudication' },
  { value: 'workshop', label: 'Workshop / Masterclass', color: 'cyan', description: 'Workshop, clinic, or masterclass' },
  { value: 'camp', label: 'Camp / Retreat', color: 'emerald', description: 'Multi-day camp or retreat' },
  { value: 'class', label: 'Class', color: 'teal', description: 'Regular academic class session' },
  { value: 'lesson', label: 'Private Lesson', color: 'indigo', description: 'Voice, instrument, or coaching lesson' },
  { value: 'meeting', label: 'Meeting', color: 'slate', description: 'General meeting' },
  { value: 'social', label: 'Social Event', color: 'lime', description: 'Social gathering, party, or celebration' },
  { value: 'fundraiser', label: 'Fundraiser', color: 'yellow', description: 'Fundraising event or campaign' },
  { value: 'community', label: 'Community Service', color: 'green', description: 'Outreach or service activity' },
  { value: 'other', label: 'Other', color: 'gray', description: 'Other event type' },
];

export const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value);

export const getEventTypeLabel = (value?: string | null): string => {
  if (!value) return 'Other';
  return EVENT_TYPES.find((t) => t.value === value)?.label || value;
};

export const getEventTypeColor = (value?: string | null): string => {
  if (!value) return 'gray';
  return EVENT_TYPES.find((t) => t.value === value)?.color || 'gray';
};

// Maps the short `color` name on each EVENT_TYPES entry (e.g. 'violet') to a
// real badge className. Some call sites (e.g. EditEventDialog) previously
// used the raw color word directly as a className, which isn't a valid
// Tailwind class on its own and rendered unstyled/gray for every event type.
// This is the token→class map referenced by design: every color used above
// has an entry here, using the --event-* CSS tokens where one already
// exists and a matching Tailwind palette color otherwise.
export const EVENT_TYPE_COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-event-performance text-event-performance-fg',
  sky: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  purple: 'bg-event-sectional text-event-sectional-fg',
  violet: 'bg-event-service text-event-service-fg',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
  pink: 'bg-event-social text-event-social-fg',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  orange: 'bg-event-workshop text-event-workshop-fg',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  slate: 'bg-event-general text-event-general-fg',
  lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  gray: 'bg-event-general text-event-general-fg',
};

const EVENT_TYPE_COLOR_CLASSES_FALLBACK = 'bg-event-general text-event-general-fg';

/** Full badge className (bg + text, incl. dark variants) for an event type value. */
export const getEventTypeBadgeClasses = (value?: string | null): string => {
  const color = getEventTypeColor(value);
  return EVENT_TYPE_COLOR_CLASSES[color] || EVENT_TYPE_COLOR_CLASSES_FALLBACK;
};
