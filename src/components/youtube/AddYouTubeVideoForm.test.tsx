// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// vi.mock factories are hoisted above the whole file, so referenced mocks
// must be created via vi.hoisted rather than plain top-level consts.
const { insertMock, selectMock, fromMock } = vi.hoisted(() => {
  const selectMock = vi.fn();
  const insertMock = vi.fn((_payload: Record<string, unknown>) => ({ select: selectMock }));
  const fromMock = vi.fn((_table: string) => ({ insert: insertMock }));
  return { insertMock, selectMock, fromMock };
});
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import { AddYouTubeVideoForm } from './AddYouTubeVideoForm';

const openForm = () => {
  fireEvent.click(screen.getByRole('button', { name: /add video/i }));
};

const fillUrl = (value: string) => {
  fireEvent.change(screen.getByLabelText('YouTube URL or video ID'), { target: { value } });
};

beforeEach(() => {
  insertMock.mockReset();
  selectMock.mockReset();
  fromMock.mockClear();
  toastMock.mockReset();
  // Default: insert().select() resolves successfully.
  insertMock.mockImplementation(() => ({ select: selectMock }));
  selectMock.mockResolvedValue({ data: [{ id: 'row-1' }], error: null });
});
afterEach(cleanup);

describe('AddYouTubeVideoForm', () => {
  it('starts collapsed behind an "Add video" button', () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add video/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('YouTube URL or video ID')).not.toBeInTheDocument();
  });

  it('rejects an invalid/non-YouTube URL inline without calling supabase', async () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://evil.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getAllByRole('button', { name: /add video/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/paste a full youtube url/i)).toBeInTheDocument();
    });
    expect(fromMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects plain junk text inline without calling supabase', async () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('not a url');
    fireEvent.click(screen.getAllByRole('button', { name: /add video/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/paste a full youtube url/i)).toBeInTheDocument();
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('accepts a valid watch URL, inserts with channel_id null and a non-empty video_url, and calls onAdded', async () => {
    const onAdded = vi.fn();
    render(<AddYouTubeVideoForm onAdded={onAdded} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getAllByRole('button', { name: /add video/i })[0]);

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

    const payload = insertMock.mock.calls[0]![0] as {
      video_id: string; channel_id: string | null; title: string; video_url: string;
    };
    expect(payload.video_id).toBe('dQw4w9WgXcQ');
    // Regression guard for the YouTubeManagement.tsx bug: channel_id must be
    // null (a UUID FK), never a non-null string like 'manual-upload'.
    expect(payload.channel_id).toBeNull();
    expect(typeof payload.video_url).toBe('string');
    expect(payload.video_url.length).toBeGreaterThan(0);
    expect(payload.video_url).toContain('dQw4w9WgXcQ');
    // No title given -> falls back to the video id, never calls a YouTube API.
    expect(payload.title).toBe('dQw4w9WgXcQ');

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
  });

  it('accepts a youtu.be short link', async () => {
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://youtu.be/dQw4w9WgXcQ');
    fireEvent.click(screen.getAllByRole('button', { name: /add video/i })[0]);

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock.mock.calls[0]![0].video_id).toBe('dQw4w9WgXcQ');
  });

  it('shows a friendly message on a unique-violation (duplicate video) instead of a raw Postgres error', async () => {
    selectMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "youtube_videos_video_id_key"' } });
    render(<AddYouTubeVideoForm onAdded={vi.fn()} />);
    openForm();
    fillUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getAllByRole('button', { name: /add video/i })[0]);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Already added', description: expect.stringMatching(/already in the library/i) })
      );
    });
  });
});
