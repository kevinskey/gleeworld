// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AssistantMiniPlayer } from './AssistantMiniPlayer';
import type { AssistantContextValue, NowPlaying } from '@/lib/assistant/AssistantProvider';

/**
 * The floating player.
 *
 * What it has to get right is narrow but easy to lose in a refactor: it shows
 * only when something is playing, it embeds the video the assistant chose, and
 * closing it actually stops the music rather than just hiding the window.
 */

const setNowPlaying = vi.fn();

vi.mock('@/lib/assistant/AssistantProvider', () => ({
  useAssistantOptional: () => mockCtx,
}));

let mockCtx: Partial<AssistantContextValue> | null = null;
const playing = (nowPlaying: NowPlaying | null) => { mockCtx = { nowPlaying, setNowPlaying }; };

beforeEach(() => { cleanup(); setNowPlaying.mockClear(); });

describe('AssistantMiniPlayer', () => {
  it('shows nothing when nothing is playing', () => {
    playing(null);
    const { container } = render(<AssistantMiniPlayer />);
    expect(container.firstChild).toBeNull();
  });

  // Mounted outside the sheet, so it must survive there being no provider at
  // all rather than taking the page down with it.
  it('shows nothing when there is no assistant provider', () => {
    mockCtx = null;
    const { container } = render(<AssistantMiniPlayer />);
    expect(container.firstChild).toBeNull();
  });

  it('embeds the video the assistant chose', () => {
    playing({ videoId: 'gDKCK_6WLTg', title: 'Ein deutsches Requiem', channel: 'hr-Sinfonieorchester' });
    render(<AssistantMiniPlayer />);
    const frame = screen.getByTitle('Ein deutsches Requiem') as HTMLIFrameElement;
    expect(frame.src).toContain('/embed/gDKCK_6WLTg');
    expect(frame.src).toContain('autoplay=1');
  });

  // A rehearsal should not quietly build an ad profile for the director.
  it('uses the no-cookie host', () => {
    playing({ videoId: 'abc123', title: 'T' });
    render(<AssistantMiniPlayer />);
    expect((screen.getByTitle('T') as HTMLIFrameElement).src).toContain('youtube-nocookie.com');
  });

  it('names what is playing', () => {
    playing({ videoId: 'abc123', title: 'Ave Maria', channel: 'Chanticleer' });
    render(<AssistantMiniPlayer />);
    expect(screen.getByText('Ave Maria')).toBeTruthy();
    expect(screen.getByText('Chanticleer')).toBeTruthy();
  });

  // Closing has to clear the state, not hide the box: an iframe left mounted
  // keeps playing, and the user would have no way to stop it.
  it('stops playing when closed', () => {
    playing({ videoId: 'abc123', title: 'T' });
    render(<AssistantMiniPlayer />);
    fireEvent.click(screen.getByLabelText('Stop playing'));
    expect(setNowPlaying).toHaveBeenCalledWith(null);
  });

  it('survives a video with no title', () => {
    playing({ videoId: 'abc123' });
    render(<AssistantMiniPlayer />);
    expect(screen.getByText('Now playing')).toBeTruthy();
  });
});
