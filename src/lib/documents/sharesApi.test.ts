import { describe, it, expect } from 'vitest';
import {
  permissionAtLeast, describePermission, isPlausibleEmail, PERMISSION_LADDER,
  describeShareTarget, isSameTarget, ROLE_LABELS,
  type DocShare,
} from './sharesApi';

/** A stored share row, with only the fields under test spelled out. */
function share(over: Partial<DocShare>): DocShare {
  return {
    id: 'id', doc_id: 'doc', share_type: 'email',
    shared_with_email: null, target_role: null, course_id: null,
    permission: 'view', created_by: 'me', created_at: '', revoked_at: null,
    ...over,
  };
}

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

describe('describeShareTarget', () => {
  it('names each kind of target', () => {
    expect(describeShareTarget(share({ share_type: 'email', shared_with_email: 'a@b.com' })))
      .toBe('a@b.com');
    expect(describeShareTarget(share({ share_type: 'role', target_role: 'member' })))
      .toBe('Everyone');
    expect(describeShareTarget(
      share({ share_type: 'course', course_id: 'c1' }), { c1: 'MUS 101' },
    )).toBe('MUS 101');
  });

  it('falls back rather than rendering a raw uuid', () => {
    // The dialog only loads classes the viewer manages, so a share can name
    // a class whose name is not in hand. "A class" beats a bare id.
    expect(describeShareTarget(share({ share_type: 'course', course_id: 'c9' }), {}))
      .toBe('A class');
    expect(describeShareTarget(share({ share_type: 'course', course_id: 'c9' })))
      .toBe('A class');
  });

  it('labels "member" as Everyone, which is what the button says', () => {
    // The DB spells the role 'member'; the control is read as "all members".
    // If these drift, the list stops describing what was clicked.
    expect(ROLE_LABELS.member).toBe('Everyone');
  });
});

describe('isSameTarget', () => {
  it('matches an email case- and whitespace-insensitively', () => {
    // The insert path lowercases and the DB trigger lowercases again; the
    // reinstate lookup has to agree or a revoked share can never come back.
    const row = share({ share_type: 'email', shared_with_email: 'a@b.com' });
    expect(isSameTarget(row, { kind: 'email', email: '  A@B.com ' })).toBe(true);
    expect(isSameTarget(row, { kind: 'email', email: 'other@b.com' })).toBe(false);
  });

  it('never matches across kinds', () => {
    const roleRow = share({ share_type: 'role', target_role: 'member' });
    expect(isSameTarget(roleRow, { kind: 'role', role: 'member' })).toBe(true);
    expect(isSameTarget(roleRow, { kind: 'role', role: 'staff' })).toBe(false);
    expect(isSameTarget(roleRow, { kind: 'email', email: 'a@b.com' })).toBe(false);

    const courseRow = share({ share_type: 'course', course_id: 'c1' });
    expect(isSameTarget(courseRow, { kind: 'course', courseId: 'c1' })).toBe(true);
    expect(isSameTarget(courseRow, { kind: 'course', courseId: 'c2' })).toBe(false);
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
