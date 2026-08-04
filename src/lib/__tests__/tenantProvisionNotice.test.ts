import { describe, it, expect } from 'vitest';
import { provisionNotice } from '../tenantProvisionNotice';

describe('provisionNotice', () => {
  it('staged with a fresh temp password: no-email toast + show-once note', () => {
    const n = provisionNotice({ staged: true, temp_password: 'p4ss' }, 'Eastside', 'dir@x.org');
    expect(n.toastTitle).toBe('Tenant created (staged)');
    expect(n.toastDescription).toBe(
      'Eastside provisioned — no email sent. Press "Welcome" on its card at handoff.',
    );
    expect(n.tempPasswordNote).toBe('Temp password for dir@x.org (shown once): p4ss');
  });

  it('staged but the admin already existed: password-unchanged note', () => {
    const n = provisionNotice({ staged: true }, 'Eastside', 'dir@x.org');
    expect(n.tempPasswordNote).toBe(
      'dir@x.org already had an account — their existing password is unchanged.',
    );
  });

  it('instant (not staged): invite-sent toast and no password note', () => {
    const n = provisionNotice({}, 'Eastside', 'dir@x.org');
    expect(n.toastTitle).toBe('Tenant created');
    expect(n.toastDescription).toBe('Eastside provisioned. Admin invite sent to dir@x.org.');
    expect(n.tempPasswordNote).toBeNull();
  });
});
