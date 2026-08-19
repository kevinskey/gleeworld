// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IosCalendarPanel } from './IosCalendarPanel';

const mockPlatform = vi.fn(() => 'ios');
const mockRequest = vi.fn(async () => ({ granted: true, status: 'authorized' }));
const mockSync    = vi.fn(async () => ({ upserted: 4, deleted: 1 }));

vi.mock('@/plugins/gwCalendar', () => ({
  isNativeCalendarAvailable: () => mockPlatform() === 'ios',
  GWCalendar: {},
}));
vi.mock('@/hooks/useIosCalendar', () => ({
  useIosCalendarAccess: () => ({ status: { granted: true, status: 'authorized' }, refresh: vi.fn(), request: mockRequest }),
  useIosCalendarSync:   () => ({ mutateAsync: mockSync, isPending: false }),
}));

afterEach(() => { cleanup(); mockPlatform.mockReturnValue('ios'); mockRequest.mockClear(); mockSync.mockClear(); });

function wrap(children: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('IosCalendarPanel', () => {
  it('renders nothing on non-iOS platforms', () => {
    mockPlatform.mockReturnValue('web');
    const { container } = render(wrap(<IosCalendarPanel />));
    expect(container.firstChild).toBeNull();
  });

  it('shows "Pull from iPhone" and calls sync on click when granted', async () => {
    render(wrap(<IosCalendarPanel />));
    const btn = screen.getByRole('button', { name: /Pull from iPhone/i });
    fireEvent.click(btn);
    await waitFor(() => expect(mockSync).toHaveBeenCalled());
  });
});
