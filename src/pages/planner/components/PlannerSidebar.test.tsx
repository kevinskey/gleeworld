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

function renderSidebar(onNewNote = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PlannerSidebar selection={{ view: 'today' }} onSelect={vi.fn()} onNewNote={onNewNote} />
    </QueryClientProvider>,
  );
  return onNewNote;
}

describe('PlannerSidebar', () => {
  it('renders the always-visible New note button and fires onNewNote', () => {
    const onNewNote = renderSidebar();
    const btn = screen.getByRole('button', { name: /new note/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onNewNote).toHaveBeenCalledTimes(1);
  });

  it('disables the New note button while a create is pending', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PlannerSidebar selection={{ view: 'today' }} onSelect={vi.fn()} onNewNote={vi.fn()} creatingNote />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: /new note/i })).toBeDisabled();
  });
});
