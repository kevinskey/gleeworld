// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async (name: string) => {
        if (name === 'fetch-news-feeds') {
          return {
            data: {
              success: true,
              items: [{
                title: 'Big Story', link: 'https://example.com/story', description: 'Feed summary',
                pubDate: '', source: 'Example News', sourceIcon: '📰', imageUrl: null,
              }],
            },
            error: null,
          };
        }
        return {
          data: { success: true, paragraphs: ['Extracted para.'], byline: null, siteName: 'Example News', truncated: false },
          error: null,
        };
      }),
    },
  },
}));
vi.mock('@/hooks/useFeedSaves', () => ({
  useFeedSaves: () => ({
    isLiked: () => false, isBookmarked: () => false,
    toggleLike: vi.fn(), toggleBookmark: vi.fn(), share: vi.fn(),
  }),
}));
vi.mock('@/lib/planner/notesApi', () => ({ createNote: vi.fn() }));

import NewsFeedSlider from './NewsFeedSlider';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('NewsFeedSlider', () => {
  it('opens the in-app reader on card tap instead of a new tab', async () => {
    const opened: string[] = [];
    vi.stubGlobal('open', (url: string) => { opened.push(url); return null; });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><NewsFeedSlider /></QueryClientProvider>);
    fireEvent.click(await screen.findByText('Big Story'));
    // Reader sheet shows the extracted story in-app; no window.open.
    expect(await screen.findByText('Extracted para.')).toBeInTheDocument();
    expect(opened).toHaveLength(0);
  });
});
