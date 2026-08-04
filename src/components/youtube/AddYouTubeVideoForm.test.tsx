// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// vi.mock factories are hoisted above the whole file, so referenced mocks
// must be created via vi.hoisted rather than plain top-level consts.
const { insertMock, selectMock, fromMock, invokeMock } = vi.hoisted(() => {
  const selectMock = vi.fn();
  const insertMock = vi.fn((_payload: Record<string, unknown>) => ({ select: selectMock }));
  const fromMock = vi.fn((_table: string) => ({ insert: insertMock }));
  const invokeMock = vi.fn();
  return { insertMock, selectMock, fromMock, invokeMock };
});
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

// `functions` matters as much as `from` here: the dialog opens in Search
// mode, and useYouTubeSearch calls supabase.functions.invoke. A mock with
// only `from` throws "Cannot read properties of undefined (reading 'invoke')"
// the moment a test types into the search box.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock, functions: { invoke: invokeMock } },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import { AddYouTubeVideoForm } from './AddYouTubeVideoForm';

const fetchMock = vi.fn();

const openForm = () => {
  fireEvent.click(screen.getByRole('button', { name: /add video/i }));
  // The dialog opens in Search mode by default; switch to Paste URL so the
  // URL input is present. Search flow is exercised separately.
  fireEvent.click(screen.getByRole('button', { name: /paste url/i }));
};

// Search mode is the default, so this just opens the dialog.
const openSearch = () => {
  fireEvent.click(screen.getByRole('button', { name: /add video/i }));
};

const typeQuery = (value: string) => {
  fireEvent.change(screen.getByLabelText('Search YouTube'), { target: { value } });
};

const fillUrl = (value: string) => {
  fireEvent.change(screen.getByLabelText('Video URL'), { target: { value } });
};

// The submit button counts the pasted links ("Add video" vs "Add 5 videos"),
// so match both shapes rather than the singular label.
const submit = () => {
  fireEvent.click(screen.getAllByRole('button', { name: /^add (\d+ )?videos?$/i })[0]);
};

const oembedOk = (title: string) =>
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ title }) });

beforeEach(() => {
  insertMock.mockReset();
  selectMock.mockReset();
  fromMock.mockClear();
  toastMock.mockReset();
  fetchMock.mockReset();
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ data: { hits: [] }, error: null });
  vi.stubGlobal('fetch', fetchMock);
  // Default: insert().select() resolves successfully.
  insertMock.mockImplementation(() => ({ select: selectMock }));
  selectMock.mockResolvedValue({ data: [{ id: 'row-1' }], error: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('AddYouTubeVideoForm', () => {
  it('starts collapsed behind an "Add video" button', () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add video/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Video URL')).not.toBeInTheDocument();
  });

  it('rejects plain junk text inline without calling supabase', async () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('not a url');
    submit();

    await waitFor(() => {
      expect(screen.getByText(/paste a youtube, vimeo/i)).toBeInTheDocument();
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('fetches the real title via oEmbed when none is typed, and inserts it', async () => {
    oembedOk('Flight — Spring Concert');
    const onAdded = vi.fn();
    render(<AddYouTubeVideoForm onAdded={onAdded} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    submit();

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('youtube.com/oembed');

    const payload = insertMock.mock.calls[0]![0] as {
      video_id: string; channel_id: string | null; title: string; video_url: string;
    };
    expect(payload.video_id).toBe('dQw4w9WgXcQ');
    // Regression guard for the YouTubeManagement.tsx bug: channel_id must be
    // null (a UUID FK), never a non-null string like 'manual-upload'.
    expect(payload.channel_id).toBeNull();
    expect(payload.video_url).toContain('dQw4w9WgXcQ');
    expect(payload.title).toBe('Flight — Spring Concert');

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
  });

  it('falls back to the video id as title when oEmbed is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'));
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    submit();

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock.mock.calls[0]![0].title).toBe('dQw4w9WgXcQ');
  });

  it('uses a typed title verbatim and skips the oEmbed lookup', async () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.change(screen.getByLabelText('Video title (optional)'), {
      target: { value: 'My concert' },
    });
    submit();

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(insertMock.mock.calls[0]![0].title).toBe('My concert');
  });

  it('accepts a youtu.be short link with tracking params', async () => {
    oembedOk('Shared from the app');
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://youtu.be/dQw4w9WgXcQ?si=g_xjbKBFkqouQU1G');
    submit();

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock.mock.calls[0]![0].video_id).toBe('dQw4w9WgXcQ');
    expect(insertMock.mock.calls[0]![0].title).toBe('Shared from the app');
  });

  it('adds every link in a pasted list, in order, with oEmbed titles', async () => {
    fetchMock.mockImplementation((input: unknown) => {
      const id = String(input).match(/watch%3Fv%3D(\w+)/)?.[1] ?? 'unknown';
      return Promise.resolve({ ok: true, json: async () => ({ title: `Title ${id}` }) });
    });
    const onAdded = vi.fn();
    render(<AddYouTubeVideoForm onAdded={onAdded} />);
    openForm();
    fillUrl(
      [
        'https://www.youtube.com/watch?v=aaaaaaaaaaa',
        'https://youtu.be/bbbbbbbbbbb?si=tracking',
        'https://www.youtube.com/watch?v=ccccccccccc',
      ].join('\n'),
    );
    submit();

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(3));
    expect(insertMock.mock.calls.map((c) => c[0].video_id)).toEqual([
      'aaaaaaaaaaa',
      'bbbbbbbbbbb',
      'ccccccccccc',
    ]);
    expect(insertMock.mock.calls[0]![0].title).toBe('Title aaaaaaaaaaa');
    // One refresh for the whole batch, not one per link.
    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
  });

  it('drops duplicate links within a single paste', async () => {
    oembedOk('Same video');
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ');
    submit();

    // Deduped down to a single link, so this takes the single-add path.
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
  });

  it('keeps going when one link in a batch is already in the library', async () => {
    oembedOk('Whatever');
    selectMock
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
      .mockResolvedValue({ data: [{ id: 'row-2' }], error: null });
    const onAdded = vi.fn();
    render(<AddYouTubeVideoForm onAdded={onAdded} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=aaaaaaaaaaa\nhttps://www.youtube.com/watch?v=bbbbbbbbbbb');
    submit();

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Added 1 of 2 links',
          description: expect.stringMatching(/1 added · 1 already in the library/i),
        }),
      ),
    );
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it('reports unreadable lines and leaves them in the box to fix', async () => {
    oembedOk('Good one');
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=aaaaaaaaaaa\nhttps://example.com/not-a-video');
    submit();

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByText(/couldn't be read/i)).toBeInTheDocument();
    });
    // Only the bad link survives in the textarea.
    expect(screen.getByLabelText('Video URL')).toHaveValue('https://example.com/not-a-video');
  });

  it('shows a friendly message on a unique-violation (duplicate video) instead of a raw Postgres error', async () => {
    oembedOk('Whatever');
    selectMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "youtube_videos_video_id_key"' } });
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    submit();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Already added', description: expect.stringMatching(/already in the library/i) })
      );
    });
  });
});

// The dialog debounces 300ms into useYouTubeSearch. The hook can only flip
// `searching` when the request starts, so everything below is about the
// window between the keystroke and the request — which is exactly where the
// pre-hook version showed a spinner and the naive post-hook version shows a
// wrong answer.
describe('AddYouTubeVideoForm — search feedback during the debounce window', () => {
  const hit = {
    videoId: 'dQw4w9WgXcQ',
    title: 'Handel — Messiah',
    channelTitle: 'Choir',
    publishedAt: '2026-01-01',
    description: '',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  };

  it('shows the spinner, never "No matches.", before the debounced search fires', () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openSearch();
    typeQuery('handel');

    // Synchronously after the keystroke: the request has not been issued yet.
    expect(invokeMock).not.toHaveBeenCalled();
    expect(screen.queryByText('No matches.')).not.toBeInTheDocument();
    expect(screen.getByText(/searching…/i)).toBeInTheDocument();
  });

  it('drops a previous search error the instant the user types a new query', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'YouTube quota exceeded' }, error: null });
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openSearch();
    typeQuery('handel');

    const err = await screen.findByText(/daily limit/i);
    expect(err).toBeInTheDocument();

    // Next keystroke: the old query's failure must not be presented as an
    // answer about the new one.
    typeQuery('handel messiah');
    expect(screen.queryByText(/daily limit/i)).not.toBeInTheDocument();
    expect(screen.getByText(/searching…/i)).toBeInTheDocument();
  });

  it('renders results once the debounced search resolves, and stops spinning', async () => {
    invokeMock.mockResolvedValue({ data: { hits: [hit] }, error: null });
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openSearch();
    typeQuery('handel');

    expect(await screen.findByText('Handel — Messiah')).toBeInTheDocument();
    expect(screen.queryByText(/searching…/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No matches.')).not.toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('still reports "No matches." once a search genuinely comes back empty', async () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openSearch();
    typeQuery('zzzzzz nothing');

    expect(await screen.findByText('No matches.')).toBeInTheDocument();
    expect(screen.queryByText(/searching…/i)).not.toBeInTheDocument();
  });
});
