// Provenance display. The brief is explicit that this stays quiet: a small
// badge and a source link, not a wall of metadata. A director should be able
// to check where a date came from without having to read past it every time.

import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { CONFIDENCE_LABEL, type Confidence } from './types';
import { trackEvent } from '@/lib/analytics';

const TONE: Record<Confidence, string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  official_source: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
  unverified: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
};

interface Props {
  confidence: Confidence;
  sourceUrl?: string | null;
  retrievedAt?: string | null;
  className?: string;
}

export function SourceBadge({ confidence, sourceUrl, retrievedAt, className }: Props) {
  const checked = retrievedAt
    ? new Date(retrievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className ?? ''}`}>
      <Badge variant="outline" className={`${TONE[confidence]} font-normal`}>
        {CONFIDENCE_LABEL[confidence]}
      </Badge>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('all_state_source_opened', { url: sourceUrl })}
          className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Source <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      )}
      {checked && <span className="text-muted-foreground">Checked {checked}</span>}
    </span>
  );
}
