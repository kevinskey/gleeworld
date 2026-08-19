// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssistantSheet } from './AssistantSheet';
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
  },
  SUPABASE_URL: 'http://localhost',
}));

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  window.matchMedia = window.matchMedia ?? (() => ({}) as MediaQueryList);
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);
}

const renderSheet = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AssistantProvider initialSheetOpen>
          <AssistantSheet />
        </AssistantProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => { sessionStorage.clear(); setViewportWidth(390); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AssistantSheet (phone)', () => {
  it('bottom sheet hugs content: max-h cap, never a fixed height', () => {
    renderSheet();
    // Radix portals the sheet to document.body.
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const classes = (dialog as HTMLElement).className.split(/\s+/);
    // Kevin's product decision (PR #158 redesign): assistant surfaces hug
    // their content — a fresh thread must not cover the page. A fixed
    // h-[85vh] regressed this on phones.
    expect(classes).toContain('max-h-[85vh]');
    expect(classes).not.toContain('h-[85vh]');
    expect(classes).toContain('flex-col');
  });

  it('renders the phone sheet (bottom variant), not the desktop spotlight bar', () => {
    renderSheet();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('bottom-0');
  });
});

describe('AssistantSheet (desktop)', () => {
  it('spotlight dialog has a visible minimize control (Esc/backdrop are invisible exits)', () => {
    setViewportWidth(1280);
    renderSheet();
    expect(document.querySelector('[aria-label="Minimize assistant"]')).not.toBeNull();
  });
});
