// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';
import { AssistantFab } from './AssistantFab';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
// AssistantProvider → useAssistantVoice → useBrandingSettings, which needs
// getTenantSlug + a queryable supabase client; stub the hook instead.
vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: {}, isLoading: false }),
}));

const renderFab = (path = '/dashboard/calendar') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={new QueryClient()}>
        <AssistantProvider><AssistantFab /></AssistantProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // jsdom has no matchMedia; useIsCompactNav needs it. matches:false = desktop.
  window.matchMedia = window.matchMedia ?? (() => ({}) as MediaQueryList);
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AssistantFab', () => {
  // The resting state. It used to float over the bottom-right corner, which
  // is where pages put Save — so the tab is now what you get until you ask.
  it('rests as an edge tab rather than floating over the corner', () => {
    renderFab();
    expect(screen.getByLabelText('Show assistant')).toBeInTheDocument();
    expect(screen.queryByLabelText('Open assistant chat')).not.toBeInTheDocument();
  });

  it('slides the pill out when the tab is tapped', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Show assistant'));
    expect(screen.getByLabelText('Open assistant chat')).toBeInTheDocument();
    // Mic stays hidden: jsdom has no speech recognition.
    expect(screen.queryByLabelText('Talk to the assistant')).not.toBeInTheDocument();
  });

  it('tucks back to the tab and remembers it for the section', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Show assistant'));
    fireEvent.click(screen.getByLabelText('Hide assistant on this page'));
    expect(screen.queryByLabelText('Open assistant chat')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Show assistant')).toBeInTheDocument();
    expect(localStorage.getItem('gw_assistant_fab_collapsed')).toContain('calendar');
  });

  // Pulling it out has to be RECORDED, not just un-set: with the collapsed
  // default, an absent key reads as tucked, so a deleted key would tuck the
  // pill away again on the next visit to a page the user had opened it on.
  it('remembers being pulled out on this section', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Show assistant'));
    expect(JSON.parse(localStorage.getItem('gw_assistant_fab_collapsed') ?? '{}'))
      .toHaveProperty('calendar', false);
  });

  it('opens straight away where the section pref says it was left out', () => {
    localStorage.setItem('gw_assistant_fab_collapsed', JSON.stringify({ calendar: false }));
    renderFab('/dashboard/calendar');
    expect(screen.getByLabelText('Open assistant chat')).toBeInTheDocument();
  });

  it('keeps a section-specific choice from leaking to other sections', () => {
    localStorage.setItem('gw_assistant_fab_collapsed', JSON.stringify({ calendar: false }));
    renderFab('/dashboard/viewer/abc');
    expect(screen.getByLabelText('Show assistant')).toBeInTheDocument();
  });
});
