// @vitest-environment jsdom
//
// Guards a layout collision reported on iPad: the card's action cluster is
// absolutely positioned (top-3 right-3), so it does NOT push the title aside —
// the title has to reserve the space itself. It reserved pr-6 (24px) while the
// cluster is up to four 24px buttons plus gaps (~104px), so the second line of
// a long filename ran underneath the icons.
//
// Worst case is a librarian, because the publish button is the fourth icon.
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

describe('MyMusicCard title / action collision', () => {
  it('reserves room for four icons when publish is offered', () => {
    render(<MyMusicCard {...baseProps} onTogglePublish={vi.fn()} published={false} />);
    // star + publish + edit + delete
    expect(titleEl().className).toContain('pr-28');
  });

  it('reserves room for three icons when publish is not offered', () => {
    render(<MyMusicCard {...baseProps} />);
    // star + edit + delete
    expect(titleEl().className).toContain('pr-20');
  });

  it('never falls back to the old pr-6, which is narrower than one icon row', () => {
    render(<MyMusicCard {...baseProps} onTogglePublish={vi.fn()} published={false} />);
    expect(titleEl().className).not.toMatch(/\bpr-6\b/);
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
