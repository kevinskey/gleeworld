// Tenant-authored card. Plain text with allowlisted {{tokens}}, rendered as
// React text nodes. NEVER dangerouslySetInnerHTML — this text is tenant input
// shown to every member, and the repo has no sanitizer.
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
    return (
      <CardFrame
        icon={Sparkles}
        eyebrow={substituteText(config.eyebrow, tokens)}
        title={title || format(ctx.now, 'EEEE')}
        subtitle={substituteText(config.subtitle, tokens) || undefined}
      />
    );
  },
};
