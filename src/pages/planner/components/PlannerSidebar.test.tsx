// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlannerSidebar from './PlannerSidebar';

// The planner data hooks hit Supabase — stub them so the sidebar renders in
// isolation. Empty data exercises the "no folders/filters/tags" render path.
vi.mock('../hooks', () => ({
  useFolders: () => ({ data: [] }),
  useSavedFilters: () => ({ data: [] }),
  useAllTags: () => ({ data: [] }),
  useTaskCounts: () => ({ data: { today: 0, overdue: 0 } }),
}));

afterEach(cleanup);

function renderSidebar(onSelect = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PlannerSidebar selection={{ view: 'today' }} onSelect={onSelect} />
    </QueryClientProvider>,
  );
  return onSelect;
}

describe('PlannerSidebar', () => {
  it('renders the always-visible core nav (Today / Tasks / Board / All notes)', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /^today$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^tasks$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^board$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all notes$/i })).toBeInTheDocument();
  });

  it('fires onSelect with the requested view when a nav row is clicked', () => {
    const onSelect = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /^tasks$/i }));
    expect(onSelect).toHaveBeenCalledWith({ view: 'tasks' });
  });
});
