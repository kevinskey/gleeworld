// Tenant-authored card. Plain text with allowlisted {{tokens}}, rendered as
// React text nodes. NEVER dangerouslySetInnerHTML — this text is tenant input
// shown to every member. The repo does have a sanitizer (src/lib/sanitizeHtml.ts,
// used for third-party HTML like usccb-readings), but that's beside the
// point here: this card's config fields are plain strings substituted into
// plain text, never parsed or rendered as markup, so there is no HTML to
// sanitize in the first place — React text nodes escape everything.
import { z } from 'zod';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { substituteText } from '@/lib/planner/templates';
import type { DateCardModule } from '../types';
import { dateCardTokenContext } from '../tokens';
import { CardFrame } from './CardFrame';

const schema = z.object({
  eyebrow: z.string().max(60).default('{{date}}'),
  title: z.string().max(80).default('{{next_event}}'),
  subtitle: z.string().max(80).default(''),
});

export const customCard: DateCardModule<typeof schema> = {
  type: 'custom',
  name: 'Custom',
  description: 'Write your own, using tokens like {{date}} and {{next_event}}.',
  icon: Sparkles,
  configSchema: schema,
  defaultConfig: { eyebrow: '{{date}}', title: '{{next_event}}', subtitle: '' },
  Render: ({ config, ctx }) => {
    const tokens = dateCardTokenContext(ctx);
    const title = substituteText(config.title, tokens).trim();
    // Trim eyebrow/subtitle too, consistent with title above — a
    // whitespace-only value (e.g. a stray space, or a token that resolved
    // to nothing surrounded by spaces) would otherwise pass CardFrame's
    // truthiness check and render as a blank line.
    const eyebrow = substituteText(config.eyebrow, tokens).trim();
    const subtitle = substituteText(config.subtitle, tokens).trim();
    // A title that is only unresolved {{token}} placeholders (e.g. the
    // default '{{next_event}}' with nothing upcoming) has no real content —
    // fall back to the weekday rather than showing the literal braces.
    // Mixed content like 'Concert {{next_event}}' still renders as-is.
    const hasRealTitleContent = title.replace(/\{\{\s*[a-z_]+\s*\}\}/g, '').trim().length > 0;
    return (
      <CardFrame
        icon={Sparkles}
        eyebrow={eyebrow}
        title={hasRealTitleContent ? title : format(ctx.now, 'EEEE')}
        subtitle={subtitle || undefined}
      />
    );
  },
};
