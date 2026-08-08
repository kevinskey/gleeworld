// @vitest-environment jsdom
//
// Regression guard for draft persistence: password/confirmPassword must
// never land in the sessionStorage draft (AuditionFormProvider.tsx,
// OMIT_FROM_DRAFT). If someone drops the filter — or renames a credential
// field without updating OMIT_FROM_DRAFT — an anonymous visitor's typed
// password would sit in sessionStorage in plain text for the rest of the
// browser session. This exercises the real form.watch() -> sessionStorage
// write path, not a re-statement of the filter list.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { getTenantSlug } from '@/integrations/supabase/client';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    isPasswordRecovery: false,
    signOut: vi.fn(),
    resetAuth: vi.fn(),
  }),
}));

import { AuditionFormProvider, useAuditionForm } from '../AuditionFormProvider';

const DRAFT_KEY = `audition-draft:${getTenantSlug()}`;

// A button (not an effect-on-mount) so the values land strictly after
// AuditionFormProvider's own mount effect has subscribed via form.watch() —
// on initial mount, child effects fire before the parent's, so setting
// values during TypeCredentials' own render or its own mount effect would
// race the subscription that is supposed to catch them.
function TypeCredentials() {
  const { form } = useAuditionForm();
  return (
    <button
      type="button"
      onClick={() => {
        form.setValue('firstName', 'Grace');
        form.setValue('password', 'super-secret-pw');
        form.setValue('confirmPassword', 'super-secret-pw');
      }}
    >
      type
    </button>
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('audition draft persistence', () => {
  it('never writes password or confirmPassword to sessionStorage', async () => {
    const { getByRole } = render(
      <AuditionFormProvider>
        <TypeCredentials />
      </AuditionFormProvider>,
    );

    fireEvent.click(getByRole('button', { name: 'type' }));

    await waitFor(() => {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      expect(raw).toBeTruthy();
    });

    const raw = sessionStorage.getItem(DRAFT_KEY)!;
    const draft = JSON.parse(raw);

    // Assert on the actual persisted object, not just its keys, so a future
    // rename (e.g. `pwd`) or a nested credential field would still be caught
    // by the string check below.
    expect(draft).not.toHaveProperty('password');
    expect(draft).not.toHaveProperty('confirmPassword');
    expect(draft.firstName).toBe('Grace');
    expect(raw).not.toContain('super-secret-pw');
  });
});
