import { describe, it, expect } from 'vitest';
import {
  permissionAtLeast, describePermission, isPlausibleEmail, PERMISSION_LADDER,
  shareTypeOf, sharesForTenant, describeShareTarget, explainShareError,
} from './sharesApi';

describe('permissionAtLeast', () => {
  it('treats the ladder as ordered, not as equality', () => {
    // The whole point: an editor can also comment and view. Policies that
    // test equality break the moment a level is added.
    expect(permissionAtLeast('edit', 'view')).toBe(true);
    expect(permissionAtLeast('edit', 'comment')).toBe(true);
    expect(permissionAtLeast('comment', 'edit')).toBe(false);
    expect(permissionAtLeast('view', 'comment')).toBe(false);
  });

  it('puts owner above every granted level', () => {
    for (const level of PERMISSION_LADDER) {
      expect(permissionAtLeast('owner', level)).toBe(true);
    }
  });

  it('denies when there is no permission at all', () => {
    // Someone the document was never shared with — and the loading state,
    // which must not render an editable page before the answer arrives.
    expect(permissionAtLeast(null, 'view')).toBe(false);
    expect(permissionAtLeast(undefined, 'view')).toBe(false);
  });

  it('matches the order the SQL helper uses', () => {
    // gw_doc_can() indexes into array['view','comment','edit','owner'].
    // If these two ever disagree, the UI offers actions RLS will refuse.
    expect([...PERMISSION_LADDER]).toEqual(['view', 'comment', 'edit', 'owner']);
  });
});

describe('describePermission', () => {
  it('names every level', () => {
    expect(describePermission('owner')).toBe('Owner');
    expect(describePermission('edit')).toBe('Can edit');
    expect(describePermission('comment')).toBe('Can comment');
    expect(describePermission('view')).toBe('Can view');
  });
});

describe('isPlausibleEmail', () => {
  it('accepts ordinary addresses, including padded input', () => {
    expect(isPlausibleEmail('kevin@gleeworld.org')).toBe(true);
    expect(isPlausibleEmail('  kevin@gleeworld.org  ')).toBe(true);
  });

  it('rejects the obvious nonsense', () => {
    expect(isPlausibleEmail('')).toBe(false);
    expect(isPlausibleEmail('kevin')).toBe(false);
    expect(isPlausibleEmail('kevin@')).toBe(false);
    expect(isPlausibleEmail('kevin@localhost')).toBe(false);
    expect(isPlausibleEmail('two addresses@example.com')).toBe(false);
  });
});

describe('audience shares', () => {
  const base = {
    doc_id: 'd1', permission: 'view' as const, created_by: 'u1',
    created_at: '2026-10-07T00:00:00Z', revoked_at: null,
  };
  const emailShare = { ...base, id: 'e', shared_with_email: 'a@b.co' };
  const everyoneHere = { ...base, id: 'r1', share_type: 'role' as const, shared_with_email: null, target_role: 'member' as const, tenant_id: 't-here' };
  const everyoneElsewhere = { ...base, id: 'r2', share_type: 'role' as const, shared_with_email: null, target_role: 'member' as const, tenant_id: 't-other' };
  const classShare = { ...base, id: 'c', share_type: 'course' as const, shared_with_email: null, course_id: 'k1', tenant_id: 't-here' };

  it('treats rows from before audience shares as email shares', () => {
    expect(shareTypeOf(emailShare)).toBe('email');
  });

  it('shows email shares everywhere but group shares only in their own workspace', () => {
    const all = [emailShare, everyoneHere, everyoneElsewhere, classShare];
    expect(sharesForTenant(all, 't-here').map((s) => s.id)).toEqual(['e', 'r1', 'c']);
    expect(sharesForTenant(all, null).map((s) => s.id)).toEqual(['e']);
  });

  it('describes each target in plain words', () => {
    expect(describeShareTarget(emailShare)).toBe('a@b.co');
    expect(describeShareTarget(everyoneHere)).toBe('Everyone in this workspace');
    expect(describeShareTarget({ ...everyoneHere, target_role: 'staff' })).toBe('All staff');
    expect(describeShareTarget(classShare, { k1: 'MUS 101' })).toBe('Class: MUS 101');
  });

  it('explains a missing share table instead of echoing the schema cache error', () => {
    expect(explainShareError({ code: 'PGRST205', message: "Could not find the table 'public.gw_doc_shares' in the schema cache" }, 'x'))
      .toMatch(/database update/);
    expect(explainShareError({ code: 'PGRST204', message: "Could not find the 'share_type' column" }, 'x'))
      .toMatch(/database update/);
    expect(explainShareError({ message: 'boom' }, 'x')).toBe('boom');
    expect(explainShareError(null, 'fallback')).toBe('fallback');
  });
});
