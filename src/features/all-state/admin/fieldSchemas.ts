// Declarative field definitions for the All-State Layer 1 staff editor.
//
// Six child entities (dates, requirements, repertoire, fees, documents, voice
// parts) all need the same CRUD affordances against different columns. Writing
// six near-identical table+dialog components would mean six places to update
// every time the canon schema grows — and the whole promise of this module is
// that adding a state is data entry, not code. So the editor is generic and
// the per-entity knowledge lives here.
//
// Adding a column to a Layer 1 table = adding one line below. No component
// changes.

export type FieldKind =
  | 'text' | 'textarea' | 'number' | 'money_cents' | 'datetime' | 'date'
  | 'select' | 'checkbox' | 'url' | 'json';

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Shown under the input. Use for the non-obvious ones only. */
  help?: string;
  /** Columns shown in the summary table (others are edit-only). */
  inTable?: boolean;
}

export interface EntityDef {
  table: string;
  label: string;
  /** Plural, for empty states and headings. */
  plural: string;
  fields: FieldDef[];
  defaultSort: string;
}

const CONFIDENCE_OPTIONS = [
  { value: 'verified', label: 'Verified — a human checked this' },
  { value: 'official_source', label: 'Official source — published, not yet checked' },
  { value: 'unverified', label: 'Unverified' },
];

/** Provenance columns every externally-sourced fact carries. */
const PROVENANCE: FieldDef[] = [
  { name: 'source_url', label: 'Source URL', kind: 'url', placeholder: 'https://…',
    help: 'The exact page this fact was read off. Shown to directors as a "Source" link.' },
  { name: 'retrieved_at', label: 'Retrieved', kind: 'date',
    help: 'When the source was last checked. Rendered as "Checked <date>".' },
  { name: 'confidence', label: 'Confidence', kind: 'select', options: CONFIDENCE_OPTIONS, required: true },
];

export const ENTITIES: Record<string, EntityDef> = {
  dates: {
    table: 'gw_all_state_dates',
    label: 'Date',
    plural: 'Dates',
    defaultSort: 'sort_order',
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true, inTable: true },
      { name: 'date_type', label: 'Type', kind: 'select', required: true, inTable: true, options: [
        { value: 'registration_deadline', label: 'Registration deadline' },
        { value: 'audition_round', label: 'Audition round' },
        { value: 'acceptance_deadline', label: 'Acceptance deadline' },
        { value: 'event', label: 'Event' },
        { value: 'results', label: 'Results announced' },
        { value: 'other', label: 'Other' },
      ] },
      { name: 'start_at', label: 'Starts', kind: 'datetime', inTable: true },
      { name: 'end_at', label: 'Ends', kind: 'datetime' },
      { name: 'all_day', label: 'No time published (date only)', kind: 'checkbox', inTable: true,
        help: 'Tick when the state published a bare date. Prevents rendering a midnight we invented.' },
      { name: 'timezone', label: 'Timezone', kind: 'text',
        help: 'The zone the STATE published it in — not the viewer\'s. Defaults to America/New_York.' },
      { name: 'description', label: 'Description', kind: 'textarea' },
      { name: 'sort_order', label: 'Sort', kind: 'number' },
      ...PROVENANCE,
    ],
  },

  requirements: {
    table: 'gw_all_state_requirements',
    label: 'Requirement',
    plural: 'Requirements',
    defaultSort: 'sort_order',
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true, inTable: true },
      { name: 'category', label: 'Category', kind: 'select', required: true, inTable: true, options: [
        { value: 'eligibility', label: 'Eligibility' },
        { value: 'membership', label: 'Membership' },
        { value: 'materials', label: 'Materials' },
        { value: 'scales', label: 'Scales' },
        { value: 'sight_reading', label: 'Sight-reading' },
        { value: 'rubric', label: 'Rubric' },
        { value: 'format', label: 'Audition format' },
        { value: 'other', label: 'Other' },
      ] },
      { name: 'description', label: 'Description', kind: 'textarea' },
      { name: 'structured_data', label: 'Structured data (JSON)', kind: 'json',
        help: 'Machine-readable detail the task generator reads — e.g. {"scales":["major","harmonic_minor"]}. Leave as {} if none.' },
      { name: 'sort_order', label: 'Sort', kind: 'number' },
      ...PROVENANCE,
    ],
  },

  repertoire: {
    table: 'gw_all_state_repertoire',
    label: 'Repertoire entry',
    plural: 'Repertoire',
    defaultSort: 'sort_order',
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true, inTable: true },
      { name: 'composer', label: 'Composer', kind: 'text', inTable: true,
        help: 'Leave blank if the state has not published it. A wrong attribution is worse than a blank.' },
      { name: 'arranger', label: 'Arranger', kind: 'text' },
      { name: 'voicing', label: 'Voicing', kind: 'text', inTable: true },
      { name: 'purpose', label: 'Purpose', kind: 'select', inTable: true, options: [
        { value: 'audition', label: 'Audition' },
        { value: 'performance', label: 'Performance' },
      ] },
      { name: 'publisher', label: 'Publisher', kind: 'text' },
      { name: 'catalog_number', label: 'Catalog number', kind: 'text' },
      { name: 'movement', label: 'Movement', kind: 'text' },
      { name: 'notes', label: 'Notes', kind: 'textarea' },
      { name: 'source_url', label: 'Source URL', kind: 'url' },
      { name: 'sort_order', label: 'Sort', kind: 'number' },
    ],
  },

  fees: {
    table: 'gw_all_state_fees',
    label: 'Fee',
    plural: 'Fees',
    defaultSort: 'fee_type',
    fields: [
      { name: 'fee_type', label: 'Fee type', kind: 'text', required: true, inTable: true,
        placeholder: 'audition / participation / late' },
      { name: 'amount_cents', label: 'Amount', kind: 'money_cents', inTable: true,
        help: 'Leave blank if the state does not publish an amount. Never copy a figure from a third-party site.' },
      { name: 'payable_to', label: 'Payable to', kind: 'select', required: true, inTable: true, options: [
        { value: 'state_association', label: 'State association (display only — no GleeWorld checkout)' },
        { value: 'director', label: 'Director collects' },
        { value: 'school', label: 'School' },
        { value: 'unknown', label: 'Unknown' },
      ], help: 'Only "Director collects" may ever route through GleeWorld payments.' },
      { name: 'currency', label: 'Currency', kind: 'text' },
      { name: 'description', label: 'Description', kind: 'textarea' },
      ...PROVENANCE,
    ],
  },

  documents: {
    table: 'gw_all_state_documents',
    label: 'Document',
    plural: 'Documents',
    defaultSort: 'sort_order',
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true, inTable: true },
      { name: 'url', label: 'URL', kind: 'url', required: true, inTable: true },
      { name: 'document_type', label: 'Type', kind: 'select', inTable: true, options: [
        { value: 'handbook', label: 'Handbook' },
        { value: 'rules', label: 'Rules' },
        { value: 'form', label: 'Form' },
        { value: 'calendar', label: 'Calendar' },
        { value: 'other', label: 'Other' },
      ] },
      { name: 'published_at', label: 'Published', kind: 'date' },
      { name: 'retrieved_at', label: 'Retrieved', kind: 'date' },
      { name: 'sort_order', label: 'Sort', kind: 'number' },
    ],
  },

  voiceParts: {
    table: 'gw_all_state_voice_parts',
    label: 'Voice part',
    plural: 'Voice parts',
    defaultSort: 'sort_order',
    fields: [
      { name: 'code', label: 'Code', kind: 'text', required: true, inTable: true,
        help: 'Our stable key, e.g. S1.' },
      { name: 'label', label: 'Label', kind: 'text', required: true, inTable: true,
        help: 'The state\'s own wording — GMEA writes "Soprano 1", not "SI".' },
      { name: 'sort_order', label: 'Sort', kind: 'number' },
    ],
  },
};

export type EntityKey = keyof typeof ENTITIES;
