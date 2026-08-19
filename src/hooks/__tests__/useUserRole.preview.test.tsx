// @vitest-environment jsdom
//
// The Views switcher used to repaint only the sidebar: every page still read
// the real super-admin profile, so AcademyHome's `isSuperAdmin() || isAdmin()`
// fork rendered the Instructor Console while the header pill said "Students".
// These cover the mask that makes useUserRole answer as the previewed role.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { previewRole } = vi.hoisted(() => ({ previewRole: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

// The gate itself (who is ALLOWED to preview) lives in useEffectivePreviewRole
// and is exercised there; here we pin its answer and test the masking.
vi.mock('@/hooks/useEffectivePreviewRole', () => ({
  useEffectivePreviewRole: () => previewRole(),
  useMyTenantRole: () => 'super-admin',
}));

// A real super-admin who also holds every app_role grant.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'app_roles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({
                data: [{ role: 'secretary' }, { role: 'librarian' }, { role: 'wardrobe_manager' }],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({
              data: {
                id: 'p1',
                user_id: 'u1',
                email: 'kevin@example.com',
                role: 'super-admin',
                is_admin: true,
                is_super_admin: true,
              },
              error: null,
            }),
          }),
        }),
      };
    },
    rpc: () => Promise.resolve({ data: 'super-admin', error: null }),
  },
}));

import { useUserRole } from '../useUserRole';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const render = async () => {
  const { result } = renderHook(() => useUserRole(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
};

beforeEach(() => previewRole.mockReset());

describe('useUserRole — Views preview', () => {
  it('reports the real super-admin when no preview is active', async () => {
    previewRole.mockReturnValue(null);
    const result = await render();
    expect(result.current.isSuperAdmin()).toBe(true);
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.hasLibrarianAppRole).toBe(true);
  });

  it('answers as a student while previewing Students', async () => {
    previewRole.mockReturnValue('student');
    const result = await render();
    // The exact fork AcademyHome takes to choose Instructor Console vs the
    // student dashboard — this is the reported bug.
    expect(result.current.isSuperAdmin()).toBe(false);
    expect(result.current.isAdmin()).toBe(false);
    expect(result.current.isInstructor()).toBe(false);
    expect(result.current.isStudent()).toBe(true);
    expect(result.current.getEffectiveRole()).toBe('student');
  });

  it('drops per-user app_role grants while previewing', async () => {
    previewRole.mockReturnValue('student');
    const result = await render();
    // A previewed student must not keep the real user's librarian grant, or
    // the Music Library still renders its edit affordances.
    expect(result.current.hasLibrarianAppRole).toBe(false);
    expect(result.current.canEditMusicLibrary()).toBe(false);
    expect(result.current.canDownloadPDF()).toBe(false);
    expect(result.current.isSecretary()).toBe(false);
    expect(result.current.isWardrobeManager()).toBe(false);
  });

  it('previews tenant admin without restoring super-admin', async () => {
    previewRole.mockReturnValue('admin');
    const result = await render();
    expect(result.current.isAdmin()).toBe(true);
    // Super-admin-only capabilities must stay off — preview narrows, never widens.
    expect(result.current.isSuperAdmin()).toBe(false);
    expect(result.current.canDeleteUsers()).toBe(false);
    expect(result.current.canManageSystemSettings()).toBe(false);
    expect(result.current.canDownloadMP3()).toBe(false);
  });

  it('ignores the membership role while previewing down', async () => {
    // gw_tenant_members.role outranks the profile role, so leaving it intact
    // would hand a previewed student admin rights straight back.
    previewRole.mockReturnValue('member');
    const result = await render();
    expect(result.current.isAdmin()).toBe(false);
    expect(result.current.isSuperAdmin()).toBe(false);
    expect(result.current.isMember()).toBe(true);
  });
});
