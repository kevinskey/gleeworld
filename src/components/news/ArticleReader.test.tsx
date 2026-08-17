// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type NotePayload = { title: string; content: { text: string }; properties: Record<string, unknown> };
const createNote = vi.fn(async (p: NotePayload) => ({ id: 'n1', title: p.title }));
vi.mock('@/lib/planner/notesApi', () => ({ createNote: (p: NotePayload) => createNote(p) }));
vi.mock('@/lib/planner/markdown', () => ({ textToDoc: (t: string) => ({ type: 'doc', text: t }) }));

const invoke = vi.fn(async (..._args: unknown[]) => ({
  data: { success: true, paragraphs: ['Para one.', 'Para two.'], byline: 'By Ada', siteName: 'Example News', truncated: false },
  error: null,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

import { ArticleBody, SaveArticleButton, ArticleReaderSheet } from './ArticleReader';

function withClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

afterEach(() => cleanup());
beforeEach(() => { createNote.mockClear(); invoke.mockClear(); });

describe('ArticleBody', () => {
  it('renders byline, paragraphs, and the truncation notice', () => {
    render(
      <ArticleBody
        extract={{ byline: 'By Ada', siteName: 'Example News', paragraphs: ['Para one.', 'Para two.'], truncated: true }}
        extracting={false}
        fallbackDescription="ignored summary"
      />,
    );
    expect(screen.getByText('By Ada')).toBeInTheDocument();
    expect(screen.getByText('Para one.')).toBeInTheDocument();
    expect(screen.getByText('Para two.')).toBeInTheDocument();
    expect(screen.getByText(/shortened/i)).toBeInTheDocument();
    expect(screen.queryByText('ignored summary')).not.toBeInTheDocument();
  });

  it('falls back to the feed summary (tags stripped, entities decoded) without an extract', () => {
    render(
      <ArticleBody
        extract={undefined}
        extracting={false}
        fallbackDescription={'A &lt;em&gt;big&lt;/em&gt; story'}
      />,
    );
    expect(screen.getByText(/A big story/)).toBeInTheDocument();
  });
});

describe('SaveArticleButton', () => {
  it('saves the extracted article as a note and flips to Saved', async () => {
    withClient(
      <SaveArticleButton
        url="https://example.com/story"
        title="Big Story"
        source="Example News"
        extract={{ byline: 'By Ada', siteName: 'Example News', paragraphs: ['Para one.'], truncated: false }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save to notes/i }));
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
    const saved = createNote.mock.calls[0][0];
    expect(saved.title).toBe('Big Story');
    expect(saved.content.text).toContain('Para one.');
    expect(saved.content.text).toContain('https://example.com/story');
    expect(saved.properties).toMatchObject({ source_url: 'https://example.com/story' });
  });

  it('saves summary + link when there is no extract', async () => {
    withClient(
      <SaveArticleButton url="https://example.com/pay" title="Walled" summary="RSS summary." extract={undefined} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save to notes/i }));
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
    expect(createNote.mock.calls[0][0].content.text).toContain('RSS summary.');
  });
});

describe('ArticleReaderSheet', () => {
  it('extracts the article and renders it with save + original-link affordances', async () => {
    withClient(
      <ArticleReaderSheet
        open
        onOpenChange={() => {}}
        item={{ title: 'Big Story', link: 'https://example.com/story', source: 'Example News', pubDate: '', description: 'Feed summary' }}
      />,
    );
    expect(await screen.findByText('Para one.')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('extract-article', { body: { url: 'https://example.com/story' } });
    expect(screen.getByRole('button', { name: /save to notes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open full article/i })).toHaveAttribute('href', 'https://example.com/story');
  });
});
