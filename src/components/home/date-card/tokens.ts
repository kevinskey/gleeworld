// Maps a DateCardContext onto the planner's allowlisted template vars.
// Tokens with no value are omitted, not blanked — substituteText leaves
// them visible so an author sees the placeholder instead of empty space.
import { format } from 'date-fns';
import type { TemplateContext } from '@/lib/planner/templates';
import type { DateCardContext } from './types';

export function dateCardTokenContext(ctx: DateCardContext): TemplateContext {
  const out: TemplateContext = {
    date: format(ctx.now, 'EEEE, MMMM d, yyyy'),
    time: format(ctx.now, 'h:mm a'),
    user_name: ctx.firstName,
  };
  if (ctx.ensembleName) out.ensemble_name = ctx.ensembleName;
  if (ctx.upNext) {
    out.next_event = ctx.upNext.title;
    out.next_event_date = format(new Date(ctx.upNext.event_at), 'EEE, MMM d');
  }
  return out;
}

/** Tokens offered in the Workspace Settings help text, in display order. */
export const DATE_CARD_TOKENS = [
  'date', 'time', 'user_name', 'ensemble_name', 'next_event', 'next_event_date',
] as const;
