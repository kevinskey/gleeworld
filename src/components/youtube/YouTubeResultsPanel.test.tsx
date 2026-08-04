// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { YouTubeResultsPanel } from './YouTubeResultsPanel';
import type { YouTubeHit } from '@/hooks/useYouTubeSearch';

afterEach(() => cleanup());

const hit = (videoId: string): YouTubeHit => ({
  videoId, title: `Title ${videoId}`, channelTitle: 'A Choir',
  publishedAt: '2026-01-01T00:00:00Z', description: '', thumbnail: '',
  url: `https://www.youtube.com/watch?v=${videoId}`,
});

const base = {
  hits: [hit('a')], searching: false, error: null, term: 'handel',
  canAdd: true, existingVideoIds: new Set<string>(), addingId: null,
  onAdd: vi.fn(), onPreview: vi.fn(), onBack: vi.fn(),
};

describe('YouTubeResultsPanel', () => {
  it('shows the search term and a way back to the library', () => {
    const onBack = vi.fn();
    render(<YouTubeResultsPanel {...base} onBack={onBack} />);
    expect(screen.getByText(/handel/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to library/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('hides Add from members who cannot add', () => {
    render(<YouTubeResultsPanel {...base} canAdd={false} />);
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
  });

  it('shows Add to admins', () => {
    render(<YouTubeResultsPanel {...base} canAdd />);
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
  });

  it('always offers preview, even without add rights', () => {
    const onPreview = vi.fn();
    render(<YouTubeResultsPanel {...base} canAdd={false} onPreview={onPreview} />);
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    expect(onPreview).toHaveBeenCalledWith(base.hits[0]);
  });

  it('marks a hit already in the library instead of offering Add', () => {
    render(<YouTubeResultsPanel {...base} existingVideoIds={new Set(['a'])} />);
    expect(screen.getByText(/in library/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
  });

  it('disables the row being added', () => {
    render(<YouTubeResultsPanel {...base} addingId="a" />);
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
  });

  it('renders the error instead of an empty list', () => {
    render(<YouTubeResultsPanel {...base} hits={[]} error="YouTube search is unavailable right now." />);
    expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/no youtube results/i)).not.toBeInTheDocument();
  });

  it('says so when a completed search found nothing', () => {
    render(<YouTubeResultsPanel {...base} hits={[]} />);
    expect(screen.getByText(/no youtube results/i)).toBeInTheDocument();
  });

  it('shows a spinner while searching', () => {
    render(<YouTubeResultsPanel {...base} hits={[]} searching />);
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });
});
