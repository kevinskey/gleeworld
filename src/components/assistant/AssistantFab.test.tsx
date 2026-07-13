// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';
import { AssistantFab } from './AssistantFab';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const renderFab = (path = '/dashboard/calendar') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AssistantProvider><AssistantFab /></AssistantProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // jsdom has no matchMedia; useIsPhone needs it. matches:false = desktop.
  window.matchMedia = window.matchMedia ?? (() => ({}) as MediaQueryList);
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AssistantFab', () => {
  it('renders the caret (mic hidden when speech is unavailable in jsdom)', () => {
    renderFab();
    expect(screen.getByLabelText('Open assistant chat')).toBeInTheDocument();
    expect(screen.queryByLabelText('Talk to the assistant')).not.toBeInTheDocument();
  });

  it('collapses to the restore dot and remembers it for the section', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Hide assistant on this page'));
    expect(screen.queryByLabelText('Open assistant chat')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Show assistant')).toBeInTheDocument();
    expect(localStorage.getItem('gw_assistant_fab_collapsed')).toContain('calendar');
  });

  it('restores from the dot', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Hide assistant on this page'));
    fireEvent.click(screen.getByLabelText('Show assistant'));
    expect(screen.getByLabelText('Open assistant chat')).toBeInTheDocument();
  });

  it('starts collapsed when the section pref says so', () => {
    localStorage.setItem('gw_assistant_fab_collapsed', JSON.stringify({ calendar: true }));
    renderFab('/dashboard/calendar');
    expect(screen.getByLabelText('Show assistant')).toBeInTheDocument();
  });
});
