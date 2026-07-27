// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AssistantResultsPanel } from './AssistantResultsPanel';
import type { ConciergeResult } from '@/lib/assistant/conciergeTypes';

afterEach(() => cleanup());

describe('AssistantResultsPanel', () => {
  it('renders ride card with two anchors carrying the deep links', () => {
    const result: ConciergeResult = {
      kind: 'ride', query: 'home', resolvedAddress: '100 Main St',
      uberUrl: 'https://m.uber.com/ul/?x=1', lyftUrl: 'https://ride.lyft.com/ride?y=1',
    };
    render(<AssistantResultsPanel result={result} onClose={() => {}} />);
    expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
    const uber = screen.getByRole('link', { name: /Uber/i });
    const lyft = screen.getByRole('link', { name: /Lyft/i });
    expect(uber).toHaveAttribute('href', result.uberUrl);
    expect(uber).toHaveAttribute('target', '_blank');
    expect(uber).toHaveAttribute('rel', 'noopener noreferrer');
    expect(lyft).toHaveAttribute('href', result.lyftUrl);
  });

  it('renders food card with three services', () => {
    const result: ConciergeResult = {
      kind: 'food', query: 'donuts', services: [
        { name: 'DoorDash', deepLinkUrl: 'https://d.example' },
        { name: 'Uber Eats', deepLinkUrl: 'https://u.example' },
        { name: 'Grubhub', deepLinkUrl: 'https://g.example' },
      ],
    };
    render(<AssistantResultsPanel result={result} onClose={() => {}} />);
    expect(screen.getByText('donuts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DoorDash' })).toHaveAttribute('href', 'https://d.example');
    expect(screen.getByRole('link', { name: 'Uber Eats' })).toHaveAttribute('href', 'https://u.example');
    expect(screen.getByRole('link', { name: 'Grubhub' })).toHaveAttribute('href', 'https://g.example');
  });

  it('renders web card with optional answer + result list', () => {
    const result: ConciergeResult = {
      kind: 'web', query: 'q', answer: 'The synthesized answer.',
      results: [
        { title: 'Result A', url: 'https://a.example', snippet: 'snippet a' },
        { title: 'Result B', url: 'https://b.example', snippet: 'snippet b' },
      ],
    };
    render(<AssistantResultsPanel result={result} onClose={() => {}} />);
    expect(screen.getByText(/synthesized answer/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Result A/ })).toHaveAttribute('href', 'https://a.example');
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    const result: ConciergeResult = { kind: 'web', query: 'q', results: [] };
    render(<AssistantResultsPanel result={result} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
