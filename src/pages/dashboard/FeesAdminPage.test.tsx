// @vitest-environment jsdom
// Smoke tests: FeesAdminPage and supporting dialogs mount without crashing.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Shared supabase stub ─────────────────────────────────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// ── Hook stubs ───────────────────────────────────────────────────────────────
vi.mock('@/hooks/useFeeTemplates', () => ({
  useFeeTemplates: () => ({
    listTemplates: vi.fn(() => Promise.resolve([])),
    createTemplate: vi.fn(() => Promise.resolve({ id: 'tpl1', name: 'Test', category: 'dues', total_amount: 100, installments: [] })),
    updateTemplate: vi.fn(),
    archiveTemplate: vi.fn(),
    refetch: vi.fn(),
    loading: false,
  }),
  FeeTemplate: {},
}));

vi.mock('@/hooks/useFeesManagement', () => ({
  useFeesManagement: () => ({
    studentFees: [],
    paymentPlans: [],
    loading: false,
    fetchStudentFees: vi.fn(),
    recordPayment: vi.fn(() => Promise.resolve()),
    refundFee: vi.fn(() => Promise.resolve()),
    waiveFee: vi.fn(() => Promise.resolve()),
    refetch: vi.fn(() => Promise.resolve()),
    createFeesForSemester: vi.fn(),
    markPaymentComplete: vi.fn(),
    createPaymentPlan: vi.fn(),
    createReminder: vi.fn(),
    sendBulkReminders: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFeeAssignment', () => ({
  useFeeAssignment: () => ({
    assign: vi.fn(() => Promise.resolve(0)),
  }),
}));

// ── Component under test ─────────────────────────────────────────────────────
import FeesAdminPage from './FeesAdminPage';

describe('FeesAdminPage smoke test', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <FeesAdminPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Fees')).toBeInTheDocument();
  });

  it('renders all category tabs', () => {
    const { container } = render(
      <MemoryRouter>
        <FeesAdminPage />
      </MemoryRouter>,
    );
    // Use getAllByRole within the rendered container to avoid cross-test collisions
    const tabs = container.querySelectorAll('[role="tab"]');
    const tabNames = Array.from(tabs).map(t => t.textContent);
    expect(tabNames).toContain('All');
    expect(tabNames).toContain('Dues');
    expect(tabNames).toContain('Wardrobe');
    expect(tabNames).toContain('Trips');
    expect(tabNames).toContain('Travel');
    expect(tabNames).toContain('Other');
  });

  it('shows + New template button', () => {
    const { getAllByText } = render(
      <MemoryRouter>
        <FeesAdminPage />
      </MemoryRouter>,
    );
    expect(getAllByText('+ New template').length).toBeGreaterThan(0);
  });
});

// ── Supporting dialog smoke tests ─────────────────────────────────────────────

import { CreateFeeTemplateDialog } from '@/components/fees/CreateFeeTemplateDialog';
import { FeeAssignDialog } from '@/components/fees/FeeAssignDialog';
import { MarkPaidDialog } from '@/components/fees/MarkPaidDialog';
import { FeeTemplateRollup } from '@/components/fees/FeeTemplateRollup';
import { FeeInstallmentScheduleEditor } from '@/components/fees/FeeInstallmentScheduleEditor';

const TEMPLATE_STUB = {
  id: 'tpl1',
  tenant_id: 'tenant1',
  category: 'dues' as const,
  name: 'Spring Dues',
  description: null,
  total_amount: 150,
  currency: 'usd',
  due_date: '2026-05-01',
  allow_self_serve_split: true,
  context_type: null,
  context_id: null,
  installments: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  archived_at: null,
};

describe('CreateFeeTemplateDialog smoke test', () => {
  it('renders when open', () => {
    render(
      <MemoryRouter>
        <CreateFeeTemplateDialog
          open
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('New fee template')).toBeInTheDocument();
  });

  it('renders Cancel and Create buttons when open', () => {
    const { getAllByText } = render(
      <MemoryRouter>
        <CreateFeeTemplateDialog
          open
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(getAllByText('Cancel').length).toBeGreaterThan(0);
    expect(getAllByText('Create template').length).toBeGreaterThan(0);
  });
});

describe('FeeAssignDialog smoke test', () => {
  it('renders when open', () => {
    render(
      <MemoryRouter>
        <FeeAssignDialog
          open
          onClose={vi.fn()}
          templateId="tpl1"
          onAssigned={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Assign to members')).toBeInTheDocument();
  });
});

describe('MarkPaidDialog smoke test', () => {
  it('renders when open', () => {
    render(
      <MemoryRouter>
        <MarkPaidDialog
          open
          onClose={vi.fn()}
          feeId="fee1"
          remainingAmount={75}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Record payment')).toBeInTheDocument();
  });
});

describe('FeeTemplateRollup smoke test', () => {
  it('renders template name', () => {
    render(
      <MemoryRouter>
        <FeeTemplateRollup template={TEMPLATE_STUB} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Spring Dues')).toBeInTheDocument();
  });
});

describe('FeeInstallmentScheduleEditor smoke test', () => {
  it('renders add installment button', () => {
    const { getAllByText } = render(
      <FeeInstallmentScheduleEditor value={[]} onChange={vi.fn()} />,
    );
    expect(getAllByText('+ Add installment').length).toBeGreaterThan(0);
  });

  it('renders existing rows', () => {
    const { getAllByText } = render(
      <FeeInstallmentScheduleEditor
        value={[{ sequence: 1, amount: 50, due_date: '2026-06-01' }]}
        onChange={vi.fn()}
      />,
    );
    expect(getAllByText('#1').length).toBeGreaterThan(0);
  });
});
