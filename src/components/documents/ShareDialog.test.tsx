// @vitest-environment jsdom
//
// The share dialog must let an owner hand a document to a whole group, not
// only one email address at a time (Yo-Doc, 2026-10-07: "I can't share my
// documents with members"). The group share goes out scoped to the
// workspace the owner is in, and the list hides group shares made in other
// workspaces.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  listShares: vi.fn(),
  upsertShare: vi.fn(),
  upsertAudienceShare: vi.fn(),
  updateSharePermission: vi.fn(),
  revokeShare: vi.fn(),
  getCurrentTenantId: vi.fn(),
}));

vi.mock('@/lib/documents/sharesApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/documents/sharesApi')>();
  return { ...real, ...api };
});
vi.mock('@/hooks/useManagedCourses', () => ({
  useManagedCourses: () => ({ data: [{ id: 'k1', course_code: 'MUS 101' }] }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { ShareDialog } from './ShareDialog';

const row = (over: Record<string, unknown>) => ({
  doc_id: 'd1', permission: 'view', created_by: 'u1', created_at: '', revoked_at: null,
  shared_with_email: null, ...over,
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('ShareDialog', () => {
  it('shares with everyone in the current workspace', async () => {
    api.getCurrentTenantId.mockResolvedValue('t-here');
    api.listShares.mockResolvedValue([
      row({ id: 'e', shared_with_email: 'a@b.co' }),
      row({ id: 'r-other', share_type: 'role', target_role: 'member', tenant_id: 't-other' }),
    ]);
    api.upsertAudienceShare.mockResolvedValue({});

    render(<ShareDialog docId="d1" userId="u1" open onOpenChange={() => {}} />);

    expect(await screen.findByText('a@b.co')).toBeInTheDocument();
    // The other workspace's "Everyone" share is not this workspace's business.
    expect(screen.queryByText('Everyone in this workspace', { selector: 'span' })).not.toBeInTheDocument();

    const group = screen.getByLabelText('Share with a group') as HTMLSelectElement;
    expect([...group.options].map((o) => o.textContent)).toEqual([
      'Everyone in this workspace', 'All staff', 'All admins', 'MUS 101',
    ]);

    fireEvent.click(screen.getAllByRole('button', { name: /share/i })[0]);
    await waitFor(() => expect(api.upsertAudienceShare).toHaveBeenCalledWith({
      docId: 'd1', audience: { kind: 'role', role: 'member' }, permission: 'view',
      createdBy: 'u1', tenantId: 't-here',
    }));
  });

  it('shares with a class', async () => {
    api.getCurrentTenantId.mockResolvedValue('t-here');
    api.listShares.mockResolvedValue([]);
    api.upsertAudienceShare.mockResolvedValue({});

    render(<ShareDialog docId="d1" userId="u1" open onOpenChange={() => {}} />);
    expect(await screen.findByText(/Only you can open this document/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Share with a group'), { target: { value: 'course:k1' } });
    fireEvent.change(screen.getByLabelText('Permission for the group'), { target: { value: 'comment' } });
    fireEvent.click(screen.getAllByRole('button', { name: /share/i })[0]);
    await waitFor(() => expect(api.upsertAudienceShare).toHaveBeenCalledWith(expect.objectContaining({
      audience: { kind: 'course', courseId: 'k1' }, permission: 'comment',
    })));
  });
});
