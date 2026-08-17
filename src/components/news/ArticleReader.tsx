// The one in-app article reader. News surfaces (HomeNewsRail,
// NewsFeedSlider) and the assistant's ArticleCard all read stories through
// this module instead of sending the user to the source site:
//  - useArticleExtract: extract-article query, one shared cache key so a
//    story opened from the rail is already warm in the assistant (and
//    vice versa).
//  - ArticleBody: extracted paragraphs / byline / truncation, with the
//    feed-summary fallback for paywalled or JS-only sites.
//  - SaveArticleButton: one tap → the article becomes a Planner note via
//    buildArticleNote (same shape the assistant's save_article_note writes).
//  - ArticleReaderSheet: the full right-hand reader sheet, browser-TTS
//    read-aloud included. The assistant panel does NOT use the sheet — it
//    keeps its own chrome and speaks in the assistant's voice instead.
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkCheck, BookmarkPlus, ExternalLink, Loader2, Volume2, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { buildArticleNote } from '@/lib/news/articleNote';

export interface ArticleExtract {
  title?: string | null;
  byline: string | null;
  siteName: string | null;
  paragraphs: string[];
  truncated: boolean;
}

export interface NewsReaderItem {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
  description?: string;
  imageUrl?: string | null;
}

// The edge function decodes the common entities but feeds still leak a few.
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Full-article extraction, best-effort (paywalls/JS pages throw so a
 *  transient blip retries on next open instead of caching a "no article"). */
export function useArticleExtract(url: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['article-extract', url],
    enabled: !!url && enabled,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<ArticleExtract> => {
      const { data, error } = await supabase.functions.invoke('extract-article', {
        body: { url },
      });
      if (error || !data?.success) throw new Error(data?.error || 'extraction failed');
      return data as ArticleExtract;
    },
  });
}

interface ArticleBodyProps {
  extract: ArticleExtract | undefined;
  extracting: boolean;
  /** Feed summary shown while extracting / when extraction failed. May
   *  contain entity-encoded markup — decoded then tag-stripped here. */
  fallbackDescription?: string;
  /** Rendered under the fallback when the source sent no summary at all. */
  emptyText?: string;
}

export function ArticleBody({ extract, extracting, fallbackDescription, emptyText }: ArticleBodyProps) {
  if (extract?.paragraphs?.length) {
    return (
      <div className="space-y-3">
        {extract.byline && (
          <p className="text-xs text-muted-foreground">{extract.byline}</p>
        )}
        {extract.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
        ))}
        {extract.truncated && (
          <p className="text-xs text-muted-foreground">
            Story shortened for the reader — the full version is on the source site.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-foreground/90">
        {fallbackDescription
          // Strip tags AFTER decoding: feeds ship entity-encoded markup
          // (&lt;em&gt;) that a pre-decode strip pass can't see.
          ? decodeEntities(fallbackDescription).replace(/<[^>]+>/g, '')
          : emptyText ?? "This source didn't include a summary. Open the full article to read the story."}
      </p>
      {extracting && (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          Loading the full story…
        </p>
      )}
    </div>
  );
}

interface SaveArticleButtonProps {
  url: string;
  title: string;
  source?: string;
  published?: string;
  /** Feed summary — the note-body fallback when there is no extract. */
  summary?: string;
  extract: ArticleExtract | undefined;
  className?: string;
}

/** One tap → the article becomes a Planner note (full text + link). */
export function SaveArticleButton({ url, title, source, published, summary, extract, className }: SaveArticleButtonProps) {
  const qc = useQueryClient();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const save = async () => {
    if (state === 'saving' || state === 'saved') return;
    setState('saving');
    try {
      const [{ createNote }, { textToDoc }] = await Promise.all([
        import('@/lib/planner/notesApi'),
        import('@/lib/planner/markdown'),
      ]);
      const built = buildArticleNote({
        title: decodeEntities(title),
        url,
        source,
        published: published || undefined,
        byline: extract?.byline ?? undefined,
        paragraphs: extract?.paragraphs,
        summary: summary ? decodeEntities(summary).replace(/<[^>]+>/g, '') : undefined,
      });
      await createNote({ title: built.title, content: textToDoc(built.body), properties: built.properties });
      qc.invalidateQueries({ queryKey: ['planner'] });
      setState('saved');
    } catch {
      setState('error');
    }
  };
  return (
    <Button
      type="button"
      variant={state === 'saved' ? 'secondary' : 'outline'}
      onClick={save}
      disabled={state === 'saving'}
      className={className}
      aria-label={state === 'saved' ? 'Saved to notes' : 'Save to notes'}
    >
      {state === 'saving' && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
      {state === 'saved' ? <BookmarkCheck className="w-4 h-4 mr-1.5" /> : state !== 'saving' && <BookmarkPlus className="w-4 h-4 mr-1.5" />}
      {state === 'saved' ? 'Saved to notes' : state === 'error' ? 'Retry save' : 'Save to notes'}
    </Button>
  );
}

interface ArticleReaderSheetProps {
  item: NewsReaderItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The right-hand reader sheet: summary instantly, full text when the
 *  server extraction lands, read-aloud (browser TTS — free, offline,
 *  interruptible), save-to-notes, and the original link as escape hatch. */
export function ArticleReaderSheet({ item, open, onOpenChange }: ArticleReaderSheetProps) {
  const { data: fullArticle, isFetching: extracting } = useArticleExtract(item?.link, open);

  // Read-aloud state; the utterance is cancelled when the sheet closes,
  // when the article changes, and on unmount.
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stopReading = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  };
  useEffect(() => {
    if (!open) stopReading();
  }, [open]);
  useEffect(() => {
    stopReading();
  }, [item?.link]);
  useEffect(() => () => stopReading(), []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {item && (
          <>
            <SheetHeader className="text-left">
              <p className="text-xs text-muted-foreground">
                {item.source}
                {item.pubDate && timeAgo(item.pubDate) && ` · ${timeAgo(item.pubDate)}`}
              </p>
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-lg leading-snug flex-1">
                  {decodeEntities(item.title)}
                </SheetTitle>
                {typeof window !== 'undefined' && 'speechSynthesis' in window && (
                  <Button
                    type="button"
                    size="sm"
                    variant={speaking ? 'destructive' : 'default'}
                    onClick={() => {
                      if (speaking) { stopReading(); return; }
                      // Title first, then the full article if extracted,
                      // otherwise the feed summary.
                      const parts: string[] = [decodeEntities(item.title)];
                      if (fullArticle?.paragraphs?.length) {
                        if (fullArticle.byline) parts.push(fullArticle.byline);
                        parts.push(...fullArticle.paragraphs);
                      } else if (item.description) {
                        parts.push(decodeEntities(item.description).replace(/<[^>]+>/g, ''));
                      }
                      const text = parts.join('. ').trim();
                      if (!text) return;
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(text);
                      u.rate = 1.0;
                      u.pitch = 1.0;
                      u.onend = () => { setSpeaking(false); utteranceRef.current = null; };
                      u.onerror = () => { setSpeaking(false); utteranceRef.current = null; };
                      utteranceRef.current = u;
                      setSpeaking(true);
                      window.speechSynthesis.speak(u);
                    }}
                    className="shrink-0 gap-1.5"
                    aria-label={speaking ? 'Stop reading' : 'Read article aloud'}
                  >
                    {speaking ? (
                      <><Square className="w-3.5 h-3.5" fill="currentColor" /> Stop</>
                    ) : (
                      <><Volume2 className="w-3.5 h-3.5" /> Read</>
                    )}
                  </Button>
                )}
              </div>
            </SheetHeader>
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="mt-3 w-full max-h-56 object-cover border border-border"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {/* Radix wires aria-describedby to SheetDescription; keep one
                (visually hidden) so the dialog stays described whether the
                summary or the full article is showing. */}
            <SheetDescription className="sr-only">
              Article from {fullArticle?.siteName || item.source || 'the source site'}
            </SheetDescription>
            <div className="mt-3">
              <ArticleBody
                extract={fullArticle}
                extracting={extracting}
                fallbackDescription={item.description}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <SaveArticleButton
                url={item.link}
                title={item.title}
                source={item.source}
                published={item.pubDate}
                summary={item.description}
                extract={fullArticle}
                className="w-full sm:w-auto"
              />
              <Button asChild className="w-full sm:w-auto">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1.5" /> Open full article
                </a>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
