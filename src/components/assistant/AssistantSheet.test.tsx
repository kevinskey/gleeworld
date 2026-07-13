// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantSheet } from './AssistantSheet';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
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
    <MemoryRouter>
      <AssistantSheet open onOpenChange={() => {}} />
    </MemoryRouter>,
  );

beforeEach(() => setViewportWidth(390));
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
