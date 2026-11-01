// @vitest-environment jsdom
//
// The card's per-score actions (star / publish / edit / delete / save-to-
// device) used to float over the top-right corner, so the title had to reserve
// up to 144px for them — which on a 3-up desktop grid left room for about six
// characters ("Welco me…", 2026-11-01). The actions now live in the footer row
// and the title owns the full card width. These tests pin that contract.
import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MyMusicCard } from './MyMusicCard';
import type { PersonalScore } from '@/hooks/usePersonalScores';

afterEach(cleanup);

// A real uploaded filename: no spaces, so it can only wrap mid-token.
const LONG_TITLE =
  'Clementi_-_Sonatinas_op._36_37_38_-_12_Sonatinas_-_Edition_Peters_-_BDH';

const SCORE = {
  id: 's-1',
  user_id: 'u-1',
  title: LONG_TITLE,
  composer: null,
  voicing: null,
  source: 'upload',
  storage_path: 'u-1/uploads/x.pdf',
  tags: null,
  is_favorite: false,
  created_at: '2026-08-08T14:54:00Z',
} as unknown as PersonalScore;

const baseProps = {
  score: SCORE,
  opening: false,
  onOpen: vi.fn(),
  onEdit: vi.fn(),
  onRemove: vi.fn(),
  onToggleFavorite: vi.fn(),
};

const titleEl = () => screen.getByTitle(LONG_TITLE);

describe('MyMusicCard title width', () => {
  it('reserves no right padding for actions, even when every action is offered', () => {
    render(
      <MyMusicCard
        {...baseProps}
        onTogglePublish={vi.fn()}
        published={false}
        onToggleDevice={vi.fn()}
        savedOnDevice={false}
      />,
    );
    expect(titleEl().className).not.toMatch(/\bpr-\d+\b/);
  });

  it('keeps the actions in the footer, not floated over the title', () => {
    render(<MyMusicCard {...baseProps} onTogglePublish={vi.fn()} published={false} />);
    const edit = screen.getByRole('button', { name: /^edit /i });
    // Walk up: no ancestor of the action button is absolutely positioned.
    let el: HTMLElement | null = edit;
    while (el) {
      expect(el.className).not.toMatch(/\babsolute\b/);
      el = el.parentElement;
    }
  });

  it('lets a space-free filename wrap instead of overflowing its box', () => {
    // break-words only breaks a token that cannot fit at all; anywhere lets the
    // clamp show two useful lines of an underscore-joined filename.
    render(<MyMusicCard {...baseProps} />);
    expect(titleEl().className).toContain('[overflow-wrap:anywhere]');
  });

  it('still clamps to two lines so cards keep a uniform height', () => {
    render(<MyMusicCard {...baseProps} />);
    expect(titleEl().className).toContain('line-clamp-2');
  });

  it('shows when the score was added and a separate Open affordance', () => {
    render(<MyMusicCard {...baseProps} />);
    expect(screen.getByText(/^Added /)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: `Open ${LONG_TITLE}` }).length).toBeGreaterThanOrEqual(2);
  });
});

describe('MyMusicCard save-to-device action', () => {
  it('renders a save-to-device action and fires it', () => {
    const onToggleDevice = vi.fn();
    render(<MyMusicCard {...baseProps} onToggleDevice={onToggleDevice} savedOnDevice={false} />);
    const btn = screen.getByRole('button', { name: /save .* to this device/i });
    fireEvent.click(btn);
    expect(onToggleDevice).toHaveBeenCalledOnce();
  });

  it('labels the action as remove when already saved on device', () => {
    render(<MyMusicCard {...baseProps} onToggleDevice={vi.fn()} savedOnDevice />);
    expect(screen.getByRole('button', { name: /remove .* from this device/i })).toBeInTheDocument();
  });
});
