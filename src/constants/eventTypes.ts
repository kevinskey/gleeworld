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
