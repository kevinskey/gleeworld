// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { url: 'https://functions.test' } },
}));

import PayFeePage from './PayFeePage';

const SUMMARY = {
  fee: {
    name: 'Fall Trip Deposit',
    category: 'trip',
    amount: 100,
    paid_amount: 25,
    remaining: 75,
    due_date: '2026-10-01',
    status: 'partial',
    student_first_name: 'Ada',
  },
  org: { name: 'Campbell MS Chorus' },
  online: true,
  offline: null,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/pay/fee/fee-1?token=tok-1']}>
      <Routes>
        <Route path="/pay/fee/:feeId" element={<PayFeePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PayFeePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the summary with a pay button when online payment is enabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY) }),
      ) as unknown as typeof fetch,
    );
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Fall Trip Deposit' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Campbell MS Chorus')).toBeInTheDocument();
    expect(screen.getByText(/for Ada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay \$75\.00 now/i })).toBeInTheDocument();
  });

  it('shows offline instructions when online payment is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...SUMMARY,
              online: false,
              offline: {
                methods: ['cash', 'check'],
                contact_name: 'Mr. Johnson',
                contact_email: 'music@school.org',
              },
            }),
        }),
      ) as unknown as typeof fetch,
    );
    renderPage();
    expect(await screen.findByText('How to pay')).toBeInTheDocument();
    expect(screen.getByText(/cash, check/)).toBeInTheDocument();
    expect(screen.getByText('Mr. Johnson')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay .* now/i })).not.toBeInTheDocument();
  });

  it('shows the invalid-link message on a 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'This payment link is not valid.' }),
        }),
      ) as unknown as typeof fetch,
    );
    renderPage();
    expect(
      await screen.findByText("We couldn't open this payment link."),
    ).toBeInTheDocument();
    expect(screen.getByText('This payment link is not valid.')).toBeInTheDocument();
  });
});
