// @vitest-environment jsdom
//
// Task 14: the create-program dialog drops the 4 template tiles for a
// title input + an optional "Start from a setlist" Select. Covers:
//  - the dialog renders a title Input and the setlist Select once opened
//    (fetching gw_setlists);
//  - submitting with a setlist chosen calls createConcertProgram with
//    { title, setlist_id } (never template_kind — the DB default covers
//    it) and navigates to the new program's editor.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// jsdom implements neither scrollIntoView nor hasPointerCapture; the Radix
// Select popover (SelectContent's Viewport + Item scroll-into-view-on-open
// effect) calls both when the dropdown opens/selects — without stubs those
// throw and crash the passive-effect pass mid-test.
if (typeof Element !== 'undefined') {
  const proto = Element.prototype as Element & {
    hasPointerCapture?: (pointerId: number) => boolean;
    releasePointerCapture?: (pointerId: number) => void;
  };
  if (!proto.scrollIntoView) proto.scrollIntoView = function scrollIntoView() {};
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const { fromMock, setlistsFetch } = vi.hoisted(() => {
  const setlistsFetch = vi.fn();
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => setlistsFetch()),
  };
  const fromMock = vi.fn((table: string) => {
    if (table === 'gw_setlists') return chain;
    throw new Error(`unexpected table ${table}`);
  });
  return { fromMock, setlistsFetch };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromMock } }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const { createConcertProgramMock } = vi.hoisted(() => ({
  createConcertProgramMock: vi.fn(async () => 'new-program-id'),
}));

vi.mock('@/hooks/useConcertPrograms', () => ({
  useConcertPrograms: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
  createConcertProgram: createConcertProgramMock,
  deleteConcertProgram: vi.fn(),
}));

vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/layout/UniversalLayout', () => ({
  UniversalLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ConcertPlannerPage from '../ConcertPlannerPage';

afterEach(cleanup);
beforeEach(() => {
  fromMock.mockClear();
  setlistsFetch.mockReset();
  navigateMock.mockClear();
  createConcertProgramMock.mockClear();
  createConcertProgramMock.mockResolvedValue('new-program-id');
});

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ConcertPlannerPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ConcertPlannerPage — create dialog', () => {
  it('renders a title input and the setlist Select, fetching gw_setlists', async () => {
    setlistsFetch.mockResolvedValue({
      data: [{ id: 'sl1', title: 'Spring Set', concert_name: 'Spring Concert' }],
      error: null,
    });

    mount();
    fireEvent.click(screen.getByRole('button', { name: /New program/i }));

    expect(screen.getByLabelText(/Program title/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/Start from a setlist/i)).toBeInTheDocument();
    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('gw_setlists'));
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('submits title + setlist_id to createConcertProgram and navigates to the editor', async () => {
    setlistsFetch.mockResolvedValue({
      data: [{ id: 'sl1', title: 'Spring Set', concert_name: 'Spring Concert' }],
      error: null,
    });

    mount();
    fireEvent.click(screen.getByRole('button', { name: /New program/i }));

    fireEvent.change(screen.getByLabelText(/Program title/i), {
      target: { value: 'Spring Concert 2026' },
    });

    fireEvent.click(await screen.findByLabelText(/Start from a setlist/i));
    fireEvent.click(await screen.findByText(/Spring Set/));

    fireEvent.click(screen.getByRole('button', { name: /Create program/i }));

    await waitFor(() => expect(createConcertProgramMock).toHaveBeenCalledWith({
      title: 'Spring Concert 2026',
      setlist_id: 'sl1',
    }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard/concert-planner/new-program-id'));
  });
});
