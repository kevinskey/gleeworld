// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ClosePeriodDialog } from '../components/ClosePeriodDialog';
import type { StandingRow } from '../useStipendStanding';

const row = (over: Partial<StandingRow>): StandingRow => ({
  award_id: 'a1', period_id: 'p1', user_id: 'u1',
  base_amount: 500, required_services: 20, per_service_value: 25,
  credited_services: 20, absences: 0, unmarked_count: 0, unmapped_count: 0,
  countable_events: 20, earned: 500, forfeited: 0,
  full_name: 'Jordan A.', email: null,
  ...over,
});

const setup = (rows: StandingRow[]) => {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(
    <ClosePeriodDialog
      periodName="Fall 2026"
      rows={rows}
      open
      onOpenChange={() => {}}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm };
};

const closeButton = () =>
  screen.getByRole('button', { name: /close period/i });

afterEach(cleanup);

describe('ClosePeriodDialog', () => {
  it('closes immediately when nobody has unmarked services', async () => {
    const { onConfirm } = setup([row({})]);

    expect(closeButton()).toBeEnabled();
    expect(screen.queryByText(/i've reviewed these/i)).not.toBeInTheDocument();

    fireEvent.click(closeButton());
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('blocks closing until the unmarked students are acknowledged', async () => {
    const { onConfirm } = setup([
      row({ award_id: 'a1', full_name: 'Jordan A.', unmarked_count: 2 }),
      row({ award_id: 'a2', full_name: 'Marcus T.', unmarked_count: 5 }),
    ]);

    expect(closeButton()).toBeDisabled();

    fireEvent.click(closeButton());
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/i've reviewed these/i));

    await waitFor(() => expect(closeButton()).toBeEnabled());
    fireEvent.click(closeButton());
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('names every student with unmarked services, worst first', () => {
    setup([
      row({ award_id: 'a1', full_name: 'Jordan A.', unmarked_count: 2 }),
      row({ award_id: 'a2', full_name: 'Marcus T.', unmarked_count: 5 }),
      row({ award_id: 'a3', full_name: 'Simone B.', unmarked_count: 0 }),
    ]);

    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Marcus T.');
    expect(items[0]).toContain('5 unmarked');
    expect(items[1]).toContain('Jordan A.');
    // A student with no gaps must not be listed as though they had one.
    expect(screen.queryByText(/Simone B\./)).not.toBeInTheDocument();
  });

  it('falls back to the email when a student has no name', () => {
    setup([row({ full_name: null, email: 'student@example.edu', unmarked_count: 1 })]);
    expect(screen.getByText('student@example.edu')).toBeInTheDocument();
  });
});
