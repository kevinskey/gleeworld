// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublishToCalendarPicker } from './PublishToCalendarPicker';

vi.mock('@/hooks/useEventSharing', () => ({
  useTenantCalendars: () => ({
    data: [
      { id: 'cal-a', name: 'Choir Main', color: '#a855f7', is_default: true },
      { id: 'cal-b', name: 'Rehearsals', color: '#0ea5e9', is_default: false },
    ],
    isLoading: false,
  }),
  useShareEvent: () => ({ mutateAsync: shareMock, isPending: false }),
}));

const shareMock = vi.fn(async (input: any) => ({ shared_event_id: 'ev-99' }));

afterEach(() => { cleanup(); shareMock.mockClear(); });

function wrap(children: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('PublishToCalendarPicker', () => {
  it('lists tenant calendars sorted by is_default DESC, name ASC', () => {
    render(wrap(<PublishToCalendarPicker open={true} onOpenChange={() => {}} source="google_calendar" sourceEventId="g-1" />));
    const buttons = screen.getAllByRole('button', { name: /Choir Main|Rehearsals/ });
    expect(buttons[0]).toHaveTextContent('Choir Main');
    expect(buttons[1]).toHaveTextContent('Rehearsals');
  });

  it('shares the event with the picked calendar_id and fires onPublished with the returned id', async () => {
    const onPublished = vi.fn();
    render(wrap(<PublishToCalendarPicker open={true} onOpenChange={() => {}} source="google_calendar" sourceEventId="g-1" onPublished={onPublished} />));
    fireEvent.click(screen.getByRole('button', { name: /Rehearsals/ }));
    await waitFor(() => expect(shareMock).toHaveBeenCalledWith({ source: 'google_calendar', source_event_id: 'g-1', calendar_id: 'cal-b' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith('ev-99'));
  });

  it('publishes an iOS-sourced event via the same picker', async () => {
    render(wrap(<PublishToCalendarPicker open={true} onOpenChange={() => {}} source="ios_calendar" sourceEventId="ek-1" onPublished={vi.fn()} />));
    fireEvent.click(screen.getByRole('button', { name: /Choir Main/ }));
    await waitFor(() => expect(shareMock).toHaveBeenCalledWith({ source: 'ios_calendar', source_event_id: 'ek-1', calendar_id: 'cal-a' }));
  });
});
