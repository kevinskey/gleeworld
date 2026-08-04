// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { YouTubeSearchField } from './YouTubeSearchField';

afterEach(() => cleanup());

const props = { searching: false, active: false, onSearch: vi.fn(), onClear: vi.fn() };

describe('YouTubeSearchField', () => {
  it('does not search while the user is only typing, even after a debounce-length delay', () => {
    // Fake timers so this genuinely rules out a debounced onChange (e.g. a
    // stray setTimeout(() => onSearch(...), 300)), not just a synchronous
    // type-triggered search. Without advancing timers, a debounced
    // implementation would pass this test too.
    vi.useFakeTimers();
    try {
      const onSearch = vi.fn();
      render(<YouTubeSearchField {...props} onSearch={onSearch} />);
      fireEvent.change(screen.getByLabelText('Search YouTube'), { target: { value: 'handel' } });
      vi.advanceTimersByTime(2000);
      expect(onSearch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('searches once on Enter', () => {
    const onSearch = vi.fn();
    render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search YouTube');
    fireEvent.change(input, { target: { value: 'handel' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('handel');
  });

  it('searches on the button', () => {
    const onSearch = vi.fn();
    render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    fireEvent.change(screen.getByLabelText('Search YouTube'), { target: { value: 'handel' } });
    fireEvent.click(screen.getByRole('button', { name: /search youtube/i }));
    expect(onSearch).toHaveBeenCalledWith('handel');
  });

  it('ignores Enter on a blank field', () => {
    const onSearch = vi.fn();
    render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByLabelText('Search YouTube'), { key: 'Enter' });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('clears the text and notifies when the clear button is used', () => {
    const onClear = vi.fn();
    render(<YouTubeSearchField {...props} active onClear={onClear} />);
    const input = screen.getByLabelText('Search YouTube') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'handel' } });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('shows no clear button until a search is active', () => {
    render(<YouTubeSearchField {...props} active={false} />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('disables the search button while a search is in flight', () => {
    render(<YouTubeSearchField {...props} searching />);
    expect(screen.getByRole('button', { name: /search youtube/i })).toBeDisabled();
  });

  // Each YouTube search costs ~100 of the platform's 10,000 daily quota units,
  // shared across every tenant. The button is disabled while searching, but
  // Enter bypasses the button entirely — so without a guard in submit(),
  // holding Enter spends the whole budget from one keyboard.
  it('does not re-search on Enter while a search is already in flight', () => {
    const onSearch = vi.fn();
    const { rerender } = render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search YouTube');

    fireEvent.change(input, { target: { value: 'handel' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledTimes(1);

    // The parent flips `searching` on while the request is out; more Enters
    // land in that window.
    rerender(<YouTubeSearchField {...props} onSearch={onSearch} searching />);
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('keeps the typed query in the box while the search is in flight', () => {
    const { rerender } = render(<YouTubeSearchField {...props} />);
    const input = screen.getByLabelText('Search YouTube') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'handel' } });
    rerender(<YouTubeSearchField {...props} searching />);
    // A blocked Enter must not discard what the user typed — it is only
    // delayed until the spinner clears.
    expect(input.value).toBe('handel');
  });

  it('empties the box when the search is cleared from outside (Back to library)', () => {
    const { rerender } = render(<YouTubeSearchField {...props} active />);
    const input = screen.getByLabelText('Search YouTube') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'handel' } });
    expect(input.value).toBe('handel');

    // The results panel's `Back to library` calls the hook's clear() directly,
    // which the field only sees as `active` going false.
    rerender(<YouTubeSearchField {...props} active={false} />);
    expect(input.value).toBe('');
  });
});
