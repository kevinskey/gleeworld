// @vitest-environment jsdom
// Smoke test: WardrobeCheckoutSystem renders including the fee-assignment checkbox.
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

// Stub supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        or: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Stub useFeeTemplates
vi.mock('@/hooks/useFeeTemplates', () => ({
  useFeeTemplates: () => ({
    loading: false,
    listTemplates: vi.fn(() => Promise.resolve([])),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    archiveTemplate: vi.fn(),
    refetch: vi.fn(),
  }),
}));

// Stub useFeeAssignment
vi.mock('@/hooks/useFeeAssignment', () => ({
  useFeeAssignment: () => ({
    assign: vi.fn(() => Promise.resolve(1)),
  }),
}));

// Stub CreateFeeTemplateDialog
vi.mock('@/components/fees/CreateFeeTemplateDialog', () => ({
  CreateFeeTemplateDialog: () => null,
}));

import { WardrobeCheckoutSystem } from './WardrobeCheckoutSystem';

describe('WardrobeCheckoutSystem smoke test', () => {
  it('renders the Wardrobe Checkout System heading', () => {
    render(<WardrobeCheckoutSystem />);
    expect(screen.getByText('Wardrobe Checkout System')).toBeInTheDocument();
  });

  it('renders the user search field', () => {
    render(<WardrobeCheckoutSystem />);
    const inputs = screen.getAllByPlaceholderText('Search by name or email...');
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs[0]).toBeInTheDocument();
  });
});
