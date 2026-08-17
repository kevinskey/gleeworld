// Turns a news item (plus its best-effort extract-article result) into the
// note shape both save paths use — the assistant's save_article_note action
// and the reader's Save-to-Notes button — so a saved article looks the same
// no matter which path wrote it.

export interface ArticleNoteInput {
  title: string;
  url: string;
  source?: string;
  /** ISO date or feed pubDate string, stored verbatim. */
  published?: string;
  byline?: string;
  paragraphs?: string[];
  /** Feed summary — the body fallback when extraction came back empty. */
  summary?: string;
}

export interface ArticleNote {
  title: string;
  body: string;
  properties: Record<string, string>;
}

export function buildArticleNote(input: ArticleNoteInput): ArticleNote {
  const headerLine = [input.source, input.published].filter(Boolean).join(' · ');
  const paragraphs = (input.paragraphs ?? []).filter((p) => p.trim());
  const bodyText = paragraphs.length
    ? paragraphs.join('\n\n')
    : input.summary?.trim()
      || 'The full text could not be pulled from the source — read it at the link above.';
  const body = [headerLine, input.url, input.byline, bodyText]
    .filter((part): part is string => !!part && !!part.trim())
    .join('\n\n');

  const properties: Record<string, string> = { source_url: input.url };
  if (input.source) properties.source_name = input.source;
  if (input.published) properties.published_at = input.published;
  return { title: input.title, body, properties };
}
